import { TriageResult } from './triage';

/** Chat message in the conversation history */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** In-memory session state held by the Durable Object */
export interface SessionState {
  sessionId: string;
  messages: Message[];
  triageResult: TriageResult | null;
  originalInput: string | null;
  status: 'idle' | 'analyzing' | 'active' | 'report_generated';
  createdAt: string;
}

export function createEmptySession(sessionId: string): SessionState {
  return {
    sessionId,
    messages: [],
    triageResult: null,
    originalInput: null,
    status: 'idle',
    createdAt: new Date().toISOString(),
  };
}
