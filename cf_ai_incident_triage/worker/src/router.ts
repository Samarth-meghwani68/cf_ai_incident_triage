import { Env } from './types/env';
import { errorResponse, NotFoundError, ValidationError, jsonResponse } from './utils/errors';
import { handleTriage } from './handlers/triage';
import { handleChat } from './handlers/chat';
import { handleReport, handleGetSession } from './handlers/report';
import { handleListCases, handleGetCase } from './handlers/cases';

/** Max request body size: 1MB */
const MAX_BODY_SIZE = 1_048_576;

/**
 * Routes API requests to the appropriate handler.
 * Returns null if the path doesn't match any API route.
 */
export async function routeRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS' && path.startsWith('/api/')) {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // Reject oversized request bodies early
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return errorResponse(new ValidationError(`Request body too large. Maximum size is ${MAX_BODY_SIZE} bytes.`));
  }

  // Health check
  if (method === 'GET' && path === '/api/health') {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Case history — GET /api/cases
  if (method === 'GET' && path === '/api/cases') {
    return handleListCases(request, env);
  }

  // Case detail — GET /api/cases/:id
  const caseMatch = path.match(/^\/api\/cases\/([a-zA-Z0-9-]+)$/);
  if (method === 'GET' && caseMatch) {
    return handleGetCase(request, env, caseMatch[1]);
  }

  // Session routes — /api/sessions/:id/:action
  const sessionMatch = path.match(/^\/api\/sessions\/([a-zA-Z0-9-]+)\/(\w+)$/);
  if (sessionMatch) {
    const sessionId = sessionMatch[1];
    const action = sessionMatch[2];

    switch (action) {
      case 'triage':
        if (method === 'POST') return addCors(await handleTriage(request, env, sessionId));
        return methodNotAllowed('POST');
      case 'chat':
        if (method === 'POST') return addCors(await handleChat(request, env, sessionId));
        return methodNotAllowed('POST');
      case 'report':
        if (method === 'POST') return addCors(await handleReport(request, env, sessionId));
        return methodNotAllowed('POST');
    }
  }

  // Session state — GET /api/sessions/:id
  const stateMatch = path.match(/^\/api\/sessions\/([a-zA-Z0-9-]+)$/);
  if (method === 'GET' && stateMatch) {
    return handleGetSession(request, env, stateMatch[1]);
  }

  // No API route matched
  if (path.startsWith('/api/')) {
    return errorResponse(new NotFoundError(`API endpoint not found: ${method} ${path}`));
  }

  return null; // Not an API request — let asset serving handle it
}

/** CORS headers for cross-origin compatibility */
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

/** Add CORS headers to an existing response */
function addCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** 405 Method Not Allowed */
function methodNotAllowed(allowed: string): Response {
  return jsonResponse(
    { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: `Use ${allowed} for this endpoint.` } },
    405,
  );
}
