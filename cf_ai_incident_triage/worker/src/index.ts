import { Env } from './types/env';
import { routeRequest } from './router';
import { errorResponse } from './utils/errors';

// Re-export the Durable Object class so wrangler can find it
export { TriageSession } from './durable-objects/triage-session';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Try to route as an API request
      const apiResponse = await routeRequest(request, env);
      if (apiResponse) return apiResponse;

      // Not an API route — return 404 (assets are handled by the platform)
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return errorResponse(error);
    }
  },
} satisfies ExportedHandler<Env>;
