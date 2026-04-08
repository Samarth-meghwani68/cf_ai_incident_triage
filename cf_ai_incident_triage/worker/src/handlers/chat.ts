import { Env } from '../types/env';

/**
 * Forwards chat messages to the session Durable Object.
 */
export async function handleChat(
  request: Request,
  env: Env,
  sessionId: string,
): Promise<Response> {
  const id = env.TRIAGE_SESSION.idFromName(sessionId);
  const stub = env.TRIAGE_SESSION.get(id);

  const doRequest = new Request('https://do-internal/chat', {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });

  return stub.fetch(doRequest);
}
