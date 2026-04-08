import { TriageResult } from './triage';

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** POST /api/sessions/:id/triage */
export interface TriageRequest {
  input: string;
}

/** POST /api/sessions/:id/chat */
export interface ChatRequest {
  message: string;
}

export interface TriageResponse {
  sessionId: string;
  result: TriageResult | null;
  parsedSuccessfully: boolean;
  rawOutput?: string;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
  messageCount: number;
}

export interface ReportResponse {
  sessionId: string;
  report: string;
}

/** Case summary for list views */
export interface CaseSummary {
  id: string;
  title: string;
  input_preview: string;
  severity: string | null;
  issue_type: string | null;
  status: string;
  created_at: string;
}

/** Full case detail with messages and report */
export interface CaseDetail extends CaseSummary {
  summary: string | null;
  triage_result: string | null;
  updated_at: string;
  messages: MessageRecord[];
  report: string | null;
}

export interface MessageRecord {
  id: number;
  role: string;
  content: string;
  message_type: string;
  created_at: string;
}
