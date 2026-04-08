import { Message } from '../types/session';
import { AIError } from '../utils/errors';

/** Default model — configurable via AI_MODEL env var in wrangler.toml */
export const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

/** Temperature presets for different tasks */
export const AI_CONFIG = {
  triage: { temperature: 0.2, max_tokens: 1024 },
  chat: { temperature: 0.6, max_tokens: 512 },
  report: { temperature: 0.4, max_tokens: 2048 },
} as const;

type AIConfigKey = keyof typeof AI_CONFIG;

/**
 * Runs text generation against Workers AI.
 * Handles response shape normalization and basic error wrapping.
 */
export async function runTextGeneration(
  ai: Ai,
  messages: Message[],
  config: (typeof AI_CONFIG)[AIConfigKey],
  model: string = DEFAULT_MODEL,
): Promise<string> {
  try {
    const result = await ai.run(model as any, {
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: config.temperature,
      max_tokens: config.max_tokens,
    });

    // Workers AI returns { response: string } for non-streaming
    if (typeof result === 'object' && result !== null && 'response' in result) {
      const response = (result as { response: string }).response;
      if (typeof response === 'string' && response.length > 0) {
        return response;
      }
    }

    // Fallback: if result is a string directly
    if (typeof result === 'string' && result.length > 0) {
      return result;
    }

    throw new AIError('AI model returned an empty or unexpected response.');
  } catch (error) {
    if (error instanceof AIError) throw error;
    console.error('Workers AI call failed:', error);
    throw new AIError(
      `AI inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
