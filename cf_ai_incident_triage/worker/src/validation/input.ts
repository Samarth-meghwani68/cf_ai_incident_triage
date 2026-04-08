/** Input size constraints */
export const INPUT_LIMITS = {
  MIN_TRIAGE_LENGTH: 10,
  MAX_TRIAGE_LENGTH: 15_000,
  MIN_CHAT_LENGTH: 1,
  MAX_CHAT_LENGTH: 2_000,
  MAX_CONVERSATION_TURNS: 20,
} as const;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTriageInput(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string.' };
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Input cannot be empty.' };
  }

  if (trimmed.length < INPUT_LIMITS.MIN_TRIAGE_LENGTH) {
    return {
      valid: false,
      error: `Input too short. Provide at least ${INPUT_LIMITS.MIN_TRIAGE_LENGTH} characters for meaningful analysis.`,
    };
  }

  if (trimmed.length > INPUT_LIMITS.MAX_TRIAGE_LENGTH) {
    return {
      valid: false,
      error: `Input exceeds the ${INPUT_LIMITS.MAX_TRIAGE_LENGTH.toLocaleString()} character limit. Please trim your input.`,
    };
  }

  return { valid: true };
}

export function validateChatMessage(message: unknown): ValidationResult {
  if (typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string.' };
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty.' };
  }

  if (trimmed.length > INPUT_LIMITS.MAX_CHAT_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds the ${INPUT_LIMITS.MAX_CHAT_LENGTH.toLocaleString()} character limit.`,
    };
  }

  return { valid: true };
}

export function validateConversationLength(messageCount: number): ValidationResult {
  if (messageCount >= INPUT_LIMITS.MAX_CONVERSATION_TURNS) {
    return {
      valid: false,
      error: `Conversation limit reached (${INPUT_LIMITS.MAX_CONVERSATION_TURNS} messages). Please start a new session.`,
    };
  }

  return { valid: true };
}
