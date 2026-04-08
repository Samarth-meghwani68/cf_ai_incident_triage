import { Env } from '../types/env';
import { SessionState, Message, createEmptySession } from '../types/session';
import {
  validateTriageInput,
  validateChatMessage,
  validateConversationLength,
} from '../validation/input';
import { parseTriageResult } from '../utils/json-parse';
import {
  successResponse,
  errorResponse,
  ValidationError,
  AIError,
} from '../utils/errors';
import { runTextGeneration, AI_CONFIG, DEFAULT_MODEL } from '../services/ai';
import { createCase, addMessage, updateCaseStatus, saveReport, loadMessages } from '../services/db';
import { buildTriagePrompt, buildTriageRetryPrompt } from '../prompts/triage';
import { buildChatPrompt } from '../prompts/chat';
import { buildReportPrompt } from '../prompts/report';

/**
 * TriageSession Durable Object — one instance per user session.
 * Holds conversation state in memory, persists to DO storage for hibernation recovery,
 * and writes to D1 for cross-session queryability.
 */
export class TriageSession implements DurableObject {
  private session: SessionState | null = null;
  private doState: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.doState = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      await this.ensureSession();

      const url = new URL(request.url);
      const path = url.pathname;

      if (request.method === 'POST' && path === '/triage') {
        return await this.handleTriage(request);
      }
      if (request.method === 'POST' && path === '/chat') {
        return await this.handleChat(request);
      }
      if (request.method === 'POST' && path === '/report') {
        return await this.handleReport();
      }
      if (request.method === 'GET' && path === '/state') {
        return successResponse({
          sessionId: this.session!.sessionId,
          status: this.session!.status,
          triageResult: this.session!.triageResult,
          messageCount: this.session!.messages.length,
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return errorResponse(error);
    }
  }

  /** Load session from DO storage or create a new one */
  private async ensureSession(): Promise<void> {
    if (this.session) return;

    const stored = await this.doState.storage.get<SessionState>('session');
    if (stored) {
      this.session = stored;
      return;
    }

    this.session = createEmptySession(this.doState.id.toString());
  }

  private async saveSession(): Promise<void> {
    await this.doState.storage.put('session', this.session!);
  }

  private getModel(): string {
    return this.env.AI_MODEL || DEFAULT_MODEL;
  }

  // ─── Triage Handler ──────────────────────────────────────────────

  private async handleTriage(request: Request): Promise<Response> {
    const body = await this.safeParseBody(request);
    const validation = validateTriageInput(body.input);
    if (!validation.valid) throw new ValidationError(validation.error!);

    if (this.session!.triageResult) {
      throw new ValidationError(
        'This session already has a triage result. Start a new session or use the chat for follow-ups.',
      );
    }

    if (this.session!.status === 'analyzing') {
      throw new ValidationError('Analysis is already in progress for this session.');
    }

    const input = (body.input as string).trim();
    this.session!.status = 'analyzing';
    this.session!.originalInput = input;

    // Call AI
    const messages = buildTriagePrompt(input);
    let rawOutput: string;
    try {
      rawOutput = await runTextGeneration(this.env.AI, messages, AI_CONFIG.triage, this.getModel());
    } catch {
      this.session!.status = 'idle';
      await this.saveSession();
      throw new AIError('Failed to get response from AI model. Please try again.');
    }

    // Parse structured output
    let { result } = parseTriageResult(rawOutput);
    let finalRaw = rawOutput;

    // Retry once on parse failure
    if (!result) {
      try {
        const retryMessages = buildTriageRetryPrompt(input, rawOutput);
        const retryOutput = await runTextGeneration(
          this.env.AI,
          retryMessages,
          AI_CONFIG.triage,
          this.getModel(),
        );
        const retryParsed = parseTriageResult(retryOutput);
        result = retryParsed.result;
        finalRaw = retryParsed.rawOutput;
      } catch {
        // Retry failed — continue with null result
      }
    }

    // Update session
    this.session!.triageResult = result;
    this.session!.status = 'active';
    this.session!.messages = [
      { role: 'user', content: input },
      { role: 'assistant', content: result ? JSON.stringify(result) : finalRaw },
    ];
    await this.saveSession();

    // Persist to D1 (non-fatal)
    try {
      await createCase(this.env.DB, {
        id: this.session!.sessionId,
        title: result?.summary?.substring(0, 100) || 'Untriaged Incident',
        input_preview: input.substring(0, 200),
        severity: result?.severity || null,
        issue_type: result?.issue_type || null,
        summary: result?.summary || null,
        triage_result: result ? JSON.stringify(result) : null,
      });
      await addMessage(this.env.DB, this.session!.sessionId, 'user', input, 'triage_input');
      await addMessage(
        this.env.DB,
        this.session!.sessionId,
        'assistant',
        result ? JSON.stringify(result) : finalRaw,
        'triage_result',
      );
    } catch (err) {
      console.error('D1 write failed (non-fatal):', err);
    }

    return successResponse({
      sessionId: this.session!.sessionId,
      result,
      parsedSuccessfully: result !== null,
      rawOutput: result ? undefined : finalRaw,
    });
  }

  // ─── Chat Handler ────────────────────────────────────────────────

  private async handleChat(request: Request): Promise<Response> {
    const body = await this.safeParseBody(request);
    const validation = validateChatMessage(body.message);
    if (!validation.valid) throw new ValidationError(validation.error!);

    const turnValidation = validateConversationLength(this.session!.messages.length);
    if (!turnValidation.valid) throw new ValidationError(turnValidation.error!);

    if (!this.session!.triageResult && this.session!.status === 'idle') {
      throw new ValidationError('Please run a triage analysis first before starting a chat.');
    }

    const message = (body.message as string).trim();

    const chatMessages = buildChatPrompt(
      this.session!.triageResult,
      this.session!.originalInput,
      this.session!.messages,
      message,
    );

    let reply: string;
    try {
      reply = await runTextGeneration(this.env.AI, chatMessages, AI_CONFIG.chat, this.getModel());
    } catch {
      throw new AIError('Failed to get chat response. Please try again.');
    }

    // Update session
    this.session!.messages.push({ role: 'user', content: message });
    this.session!.messages.push({ role: 'assistant', content: reply });
    await this.saveSession();

    // Persist to D1 (non-fatal)
    try {
      await addMessage(this.env.DB, this.session!.sessionId, 'user', message, 'chat');
      await addMessage(this.env.DB, this.session!.sessionId, 'assistant', reply, 'chat');
    } catch (err) {
      console.error('D1 chat write failed (non-fatal):', err);
    }

    return successResponse({
      sessionId: this.session!.sessionId,
      reply,
      messageCount: this.session!.messages.length,
    });
  }

  // ─── Report Handler ──────────────────────────────────────────────

  private async handleReport(): Promise<Response> {
    if (!this.session!.triageResult) {
      throw new ValidationError('No triage result available. Run a triage analysis first.');
    }

    const reportMessages = buildReportPrompt(
      this.session!.triageResult,
      this.session!.originalInput,
      this.session!.messages,
    );

    let report: string;
    try {
      report = await runTextGeneration(this.env.AI, reportMessages, AI_CONFIG.report, this.getModel());
    } catch {
      throw new AIError('Failed to generate report. Please try again.');
    }

    this.session!.status = 'report_generated';
    await this.saveSession();

    // Persist to D1 (non-fatal)
    try {
      await saveReport(this.env.DB, this.session!.sessionId, report);
      await updateCaseStatus(this.env.DB, this.session!.sessionId, 'report_generated');
    } catch (err) {
      console.error('D1 report write failed (non-fatal):', err);
    }

    return successResponse({
      sessionId: this.session!.sessionId,
      report,
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  /** Safely parse JSON body — returns empty object on failure instead of crashing */
  private async safeParseBody(request: Request): Promise<Record<string, unknown>> {
    try {
      const body = await request.json();
      if (typeof body === 'object' && body !== null) {
        return body as Record<string, unknown>;
      }
      return {};
    } catch {
      throw new ValidationError('Invalid request body. Expected JSON.');
    }
  }
}
