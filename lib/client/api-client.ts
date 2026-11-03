import { getRawInitData } from '@/lib/client/telegram';
import type { ApiErrorBody } from '@/types/api';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function authorization(): string {
  const raw = getRawInitData();
  if (raw) return raw;
  // Replaced at build time; the branch is removed from production bundles.
  if (process.env.NODE_ENV !== 'production') return 'dev-mock';
  throw new ApiClientError('Open this app from Telegram to continue.', 'NO_TELEGRAM', 0);
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      signal: options.signal,
      headers: {
        Authorization: authorization(),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof ApiClientError || (error instanceof DOMException && error.name === 'AbortError')) throw error;
    throw new ApiClientError('Network error. Check your connection and retry.', 'NETWORK', 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    const message =
      response.status === 403
        ? 'This Telegram account is not allowed to use this app.'
        : (body?.error ?? 'Request failed. Please retry.');
    throw new ApiClientError(message, body?.code ?? 'HTTP_ERROR', response.status);
  }
  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
