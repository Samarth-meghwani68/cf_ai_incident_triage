-- cf_ai_incident_triage D1 Schema
-- Run: wrangler d1 execute incident-triage-db --local --file=./migrations/0001_initial.sql

DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS cases;

-- Cases: one row per triage session
CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  input_preview TEXT NOT NULL,
  severity TEXT,
  issue_type TEXT,
  summary TEXT,
  triage_result TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Messages: full conversation history per case
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Reports: generated incident reports
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE INDEX idx_messages_case_id ON messages(case_id);
CREATE INDEX idx_cases_created_at ON cases(created_at);
CREATE INDEX idx_reports_case_id ON reports(case_id);
