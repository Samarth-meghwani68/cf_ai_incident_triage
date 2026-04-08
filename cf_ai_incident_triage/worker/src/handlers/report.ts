import { Env } from '../types/env';

/**
 * Forwards report generation requests to the session Durable Object.
 */
export async function handleReport(
  request: Request,
  env: Env,
  sessionId: string,
): Promise<Response> {
  const id = env.TRIAGE_SESSION.idFromName(sessionId);
  const stub = env.TRIAGE_SESSION.get(id);

  const doRequest = new Request('https://do-internal/report', {
    method: 'POST',
  });

  return stub.fetch(doRequest);
}

/**
 * Gets current session state from the Durable Object.
 */
export async function handleGetSession(
  request: Request,
  env: Env,
  sessionId: string,
): Promise<Response> {
  const id = env.TRIAGE_SESSION.idFromName(sessionId);
  const stub = env.TRIAGE_SESSION.get(id);

  const doRequest = new Request('https://do-internal/state', {
    method: 'GET',
  });

  return stub.fetch(doRequest);
}
