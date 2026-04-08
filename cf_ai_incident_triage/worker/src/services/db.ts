import { CaseSummary, CaseDetail, MessageRecord } from '../types/api';

/** Create a new case in D1 */
export async function createCase(
  db: D1Database,
  data: {
    id: string;
    title: string;
    input_preview: string;
    severity: string | null;
    issue_type: string | null;
    summary: string | null;
    triage_result: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO cases (id, title, input_preview, severity, issue_type, summary, triage_result, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    )
    .bind(
      data.id,
      data.title,
      data.input_preview,
      data.severity,
      data.issue_type,
      data.summary,
      data.triage_result,
      now,
      now,
    )
    .run();
}

/** Update case status or triage data */
export async function updateCaseStatus(
  db: D1Database,
  caseId: string,
  status: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE cases SET status = ?, updated_at = ? WHERE id = ?`)
    .bind(status, now, caseId)
    .run();
}

/** Add a message to the conversation history */
export async function addMessage(
  db: D1Database,
  caseId: string,
  role: string,
  content: string,
  messageType: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO messages (case_id, role, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(caseId, role, content, messageType, now)
    .run();
}

/** Save a generated report */
export async function saveReport(
  db: D1Database,
  caseId: string,
  content: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR REPLACE INTO reports (case_id, content, created_at)
       VALUES (?, ?, ?)`,
    )
    .bind(caseId, content, now)
    .run();
}

/** List all cases, newest first */
export async function listCases(db: D1Database): Promise<CaseSummary[]> {
  const result = await db
    .prepare(
      `SELECT id, title, input_preview, severity, issue_type, status, created_at
       FROM cases ORDER BY created_at DESC LIMIT 50`,
    )
    .all<CaseSummary>();

  return result.results || [];
}

/** Get full case detail with messages and report */
export async function getCaseDetail(
  db: D1Database,
  caseId: string,
): Promise<CaseDetail | null> {
  const caseResult = await db
    .prepare(`SELECT * FROM cases WHERE id = ?`)
    .bind(caseId)
    .first<CaseSummary & { summary: string | null; triage_result: string | null; updated_at: string }>();

  if (!caseResult) return null;

  const messagesResult = await db
    .prepare(
      `SELECT id, role, content, message_type, created_at
       FROM messages WHERE case_id = ? ORDER BY id ASC`,
    )
    .bind(caseId)
    .all<MessageRecord>();

  const reportResult = await db
    .prepare(`SELECT content FROM reports WHERE case_id = ?`)
    .bind(caseId)
    .first<{ content: string }>();

  return {
    ...caseResult,
    messages: messagesResult.results || [],
    report: reportResult?.content || null,
  };
}

/** Load messages for a case (used by DO to restore state after hibernation) */
export async function loadMessages(
  db: D1Database,
  caseId: string,
): Promise<MessageRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, role, content, message_type, created_at
       FROM messages WHERE case_id = ? ORDER BY id ASC`,
    )
    .bind(caseId)
    .all<MessageRecord>();

  return result.results || [];
}
