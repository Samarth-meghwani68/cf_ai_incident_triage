/**
 * Cloudflare Worker environment bindings.
 * Matches the bindings declared in wrangler.toml.
 */
export interface Env {
  DB: D1Database;
  AI: Ai;
  TRIAGE_SESSION: DurableObjectNamespace;
  AI_MODEL: string;
}
