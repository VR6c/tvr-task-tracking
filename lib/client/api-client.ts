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

/** initData inside Telegram; in a normal browser no header, so the server falls back to the session cookie. */
function authorization(): Record<string, string> {
  const raw = getRawInitData();
  if (raw) return { Authorization: raw };
  // Replaced at build time; the branch is removed from production bundles.
  if (process.env.NODE_ENV !== 'production') return { Authorization: 'dev-mock' };
  return {};
}

/** Browser without a valid session: send the user to the Telegram login page, then back here. */
function redirectToLogin(): void {
  if (typeof window === 'undefined' || getRawInitData() || window.location.pathname === '/login') return;
  const next = window.location.pathname + window.location.search;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload resets auth state
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
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
        ...authorization(),
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
    if (response.status === 401) redirectToLogin();
    const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    const message =
      response.status === 403
        ? 'This Telegram account is not allowed to use this app.'
        : (body?.error ?? 'Request failed. Please retry.');
    throw new ApiClientError(message, body?.code ?? 'HTTP_ERROR', response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
