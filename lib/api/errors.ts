import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '@/types/api';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'NOT_FOUND'
  | 'NOT_CONFIGURED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static unauthorized(message = 'Invalid or missing Telegram credentials') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'This Telegram account is not allowed to use this app') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static notConfigured(message: string) {
    return new ApiError(409, 'NOT_CONFIGURED', message);
  }
  static upstream(message = 'Telegram request failed') {
    return new ApiError(502, 'UPSTREAM_ERROR', message);
  }
}

export function errorResponse(status: number, code: ApiErrorCode, message: string): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, code }, { status });
}

function describeZodError(error: ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
    .join('; ');
}

/** Maps anything thrown by a handler to the single `{ error, code }` response shape. */
export function toErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) return errorResponse(error.status, error.code, error.message);
  if (error instanceof ZodError) return errorResponse(422, 'VALIDATION_ERROR', describeZodError(error));
  console.error('Unhandled API error', error);
  return errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
}
