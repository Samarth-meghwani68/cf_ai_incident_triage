/** Severity levels for triaged incidents */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export const SEVERITY_VALUES: readonly Severity[] = ['low', 'medium', 'high', 'critical'] as const;

/** Structured triage output from the AI model */
export interface TriageResult {
  summary: string;
  issue_type: string;
  severity: Severity;
  likely_causes: string[];
  debugging_steps: string[];
  confidence: number;
  assumptions_or_unknowns: string[];
}

export function isValidSeverity(value: string): value is Severity {
  return SEVERITY_VALUES.includes(value as Severity);
}
