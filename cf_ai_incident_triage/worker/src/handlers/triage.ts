import { Env } from '../types/env';

/**
 * Forwards the request to the TriageSession Durable Object.
 * The DO handles validation, AI calls, and persistence internally.
 */
export async function handleTriage(
  request: Request,
  env: Env,
  sessionId: string,
): Promise<Response> {
  const id = env.TRIAGE_SESSION.idFromName(sessionId);
  const stub = env.TRIAGE_SESSION.get(id);

  const doRequest = new Request('https://do-internal/triage', {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });

  return stub.fetch(doRequest);
}
