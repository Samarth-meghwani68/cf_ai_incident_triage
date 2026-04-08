import { TriageResult, isValidSeverity } from '../types/triage';

/**
 * Attempts to parse a TriageResult from raw model output.
 * Handles common LLM quirks: markdown code fences, trailing text, etc.
 */
export function parseTriageResult(raw: string): { result: TriageResult | null; rawOutput: string } {
  const cleaned = extractJsonFromText(raw);

  try {
    const parsed = JSON.parse(cleaned);
    const validated = validateTriageShape(parsed);
    if (validated) {
      return { result: validated, rawOutput: raw };
    }
  } catch {
    // JSON parse failed — fall through
  }

  return { result: null, rawOutput: raw };
}

/** Extracts JSON from text that may contain markdown code fences or prose */
function extractJsonFromText(text: string): string {
  // Try ```json ... ``` blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find a raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return text.trim();
}

/** Validates parsed object matches TriageResult schema, applies safe defaults */
function validateTriageShape(obj: unknown): TriageResult | null {
  if (typeof obj !== 'object' || obj === null) return null;

  const o = obj as Record<string, unknown>;

  const summary = typeof o.summary === 'string' ? o.summary : null;
  const issue_type = typeof o.issue_type === 'string' ? o.issue_type : null;
  if (!summary || !issue_type) return null;

  const rawSeverity = typeof o.severity === 'string' ? o.severity.toLowerCase() : 'medium';
  const severity = isValidSeverity(rawSeverity) ? rawSeverity : 'medium';

  const likely_causes = coerceStringArray(o.likely_causes);
  const debugging_steps = coerceStringArray(o.debugging_steps);
  const assumptions_or_unknowns = coerceStringArray(o.assumptions_or_unknowns);

  let confidence = typeof o.confidence === 'number' ? o.confidence : 0.5;
  // Normalize: if model returns 0-100 scale, convert to 0-1
  if (confidence > 1) confidence = confidence / 100;
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    summary,
    issue_type,
    severity,
    likely_causes,
    debugging_steps,
    confidence,
    assumptions_or_unknowns,
  };
}

function coerceStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.filter((item): item is string => typeof item === 'string');
  }
  if (typeof val === 'string') {
    return [val];
  }
  return [];
}
