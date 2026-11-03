import { createSign } from 'node:crypto';
import { ApiError } from '@/lib/api/errors';
import { getEnv } from '@/lib/env';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SheetsConfig {
  email: string;
  privateKey: string;
  spreadsheetId: string;
  tab: string;
}

/** Throws a readable 409 when the Google env vars are missing, so callers can surface "not configured". */
export function getSheetsConfig(): SheetsConfig {
  const env = getEnv();
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_SHEET_ID) {
    throw ApiError.notConfigured(
      'Google Sheets sync is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and GOOGLE_SHEET_ID.',
    );
  }
  return {
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Env files store the PEM with literal "\n" sequences.
    privateKey: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    spreadsheetId: env.GOOGLE_SHEET_ID,
    tab: env.GOOGLE_SHEET_TAB,
  };
}

const base64url = (value: string | Buffer): string => Buffer.from(value).toString('base64url');

let cached: { token: string; expiresAt: number } | undefined;

/** Service-account OAuth: sign a JWT (RS256) and exchange it for a short-lived access token. */
async function getAccessToken(config: SheetsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) return cached.token;

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({ iss: config.email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(config.privateKey);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed (${response.status})`);
  const body = (await response.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, expiresAt: now + body.expires_in };
  return cached.token;
}

export async function sheetsFetch<T>(config: SheetsConfig, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${SHEETS_URL}/${config.spreadsheetId}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${await getAccessToken(config)}`,
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`Google Sheets ${init.method ?? 'GET'} ${path} failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as T;
}
