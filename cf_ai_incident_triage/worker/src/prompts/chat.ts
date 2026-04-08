import { Message } from '../types/session';
import { TriageResult } from '../types/triage';

/**
 * Builds the message array for a follow-up chat request.
 * Includes the triage context so the model stays grounded.
 */
export function buildChatPrompt(
  triageResult: TriageResult | null,
  originalInput: string | null,
  conversationHistory: Message[],
  newMessage: string,
): Message[] {
  const contextSummary = triageResult
    ? `Previous triage result:\n- Summary: ${triageResult.summary}\n- Type: ${triageResult.issue_type}\n- Severity: ${triageResult.severity}\n- Causes: ${triageResult.likely_causes.join(', ')}\n- Confidence: ${triageResult.confidence}`
    : 'No triage result available.';

  const systemPrompt = `You are an expert debugging assistant following up on an incident triage session.

Context from the initial analysis:
${contextSummary}

${originalInput ? `Original input (first 500 chars): ${originalInput.substring(0, 500)}` : ''}

Guidelines:
- Stay grounded in the context of this specific incident
- Be concise and technically precise
- If asked about something outside the incident context, acknowledge it but refocus
- If you don't know something, say so — do not fabricate details
- Reference specific details from the original input and triage when relevant
- Suggest concrete, actionable steps when possible`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Include recent conversation history (skip system messages, cap at last 10 exchanges)
  const recentHistory = conversationHistory
    .filter((m) => m.role !== 'system')
    .slice(-10);

  messages.push(...recentHistory);
  messages.push({ role: 'user', content: newMessage });

  return messages;
}
