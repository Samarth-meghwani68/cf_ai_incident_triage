import { ApiResponse } from '../types/api';

/** Base application error with HTTP status code */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class AIError extends AppError {
  constructor(message: string = 'AI service error') {
    super(502, 'AI_ERROR', message);
    this.name = 'AIError';
  }
}

/** Convert any error into a structured JSON Response */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonResponse<ApiResponse>(
      { success: false, error: { code: error.code, message: error.message } },
      error.statusCode,
    );
  }

  console.error('Unhandled error:', error);
  return jsonResponse<ApiResponse>(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
    500,
  );
}

/** Create a JSON Response with proper headers */
export function jsonResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

/** Convenience wrapper for success responses */
export function successResponse<T>(data: T): Response {
  return jsonResponse<ApiResponse<T>>({ success: true, data }, 200);
}
