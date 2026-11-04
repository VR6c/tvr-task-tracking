import { createHash, createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateLoginWidget } from '@/lib/auth/login-widget';
import { createSessionToken, readCookie, SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { authenticate } from '@/lib/auth/with-auth';

const BOT_TOKEN = '123456789:AAH-test-token';
const USER_ID = 100200300;
const NOW = new Date('2026-11-03T03:00:00.000Z');
const nowSeconds = Math.floor(NOW.getTime() / 1000);

function signWidget(fields: Record<string, string | number>, token = BOT_TOKEN) {
  const check = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHash('sha256').update(token).digest();
  return { ...fields, hash: createHmac('sha256', secret).update(check).digest('hex') };
}

const widgetUser = () => ({ id: USER_ID, first_name: 'Thary', username: 'tvr', auth_date: nowSeconds - 30 });

describe('validateLoginWidget', () => {
  it('accepts correctly signed widget data', () => {
    expect(validateLoginWidget(signWidget(widgetUser()), BOT_TOKEN, { now: NOW })).toEqual({ ok: true, userId: USER_ID });
  });

  it('rejects data signed with another bot token or tampered fields', () => {
    expect(validateLoginWidget(signWidget(widgetUser(), '999:other'), BOT_TOKEN, { now: NOW })).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
    const tampered = { ...signWidget(widgetUser()), id: 1 };
    expect(validateLoginWidget(tampered, BOT_TOKEN, { now: NOW }).ok).toBe(false);
  });

  it('rejects stale and malformed data', () => {
    const old = signWidget({ ...widgetUser(), auth_date: nowSeconds - 3600 });
    expect(validateLoginWidget(old, BOT_TOKEN, { now: NOW })).toEqual({ ok: false, reason: 'expired' });
    expect(validateLoginWidget({ id: USER_ID }, BOT_TOKEN, { now: NOW })).toEqual({ ok: false, reason: 'malformed' });
    expect(validateLoginWidget(null, BOT_TOKEN, { now: NOW })).toEqual({ ok: false, reason: 'malformed' });
  });
});

describe('session token', () => {
  it('round-trips and expires after 7 days', () => {
    const token = createSessionToken(USER_ID, BOT_TOKEN, NOW);
    expect(verifySessionToken(token, BOT_TOKEN, NOW)).toBe(USER_ID);
    expect(verifySessionToken(token, BOT_TOKEN, new Date(NOW.getTime() + 8 * 86_400_000))).toBeNull();
  });

  it('rejects forged or foreign tokens', () => {
    const token = createSessionToken(USER_ID, BOT_TOKEN, NOW);
    expect(verifySessionToken(token.replace(String(USER_ID), '1'), BOT_TOKEN, NOW)).toBeNull();
    expect(verifySessionToken(token, '999:other', NOW)).toBeNull();
    expect(verifySessionToken('garbage', BOT_TOKEN, NOW)).toBeNull();
    expect(verifySessionToken(null, BOT_TOKEN, NOW)).toBeNull();
  });

  it('reads a cookie from the request header', () => {
    const req = new Request('https://app.example.com', { headers: { cookie: `a=1; ${SESSION_COOKIE}=abc; b=2` } });
    expect(readCookie(req, SESSION_COOKIE)).toBe('abc');
    expect(readCookie(req, 'missing')).toBeNull();
  });
});

describe('authenticate with a session cookie', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('BOT_TOKEN', BOT_TOKEN);
    vi.stubEnv('ALLOWED_TELEGRAM_USER_ID', String(USER_ID));
    vi.stubEnv('WEBHOOK_SECRET', 'secret');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com');
    vi.stubEnv('CRON_SECRET', 'cron-secret');
  });
  afterEach(() => vi.unstubAllEnvs());

  const request = (method: string, userId = USER_ID, origin?: string) =>
    new Request('https://app.example.com/api/admin/stats', {
      method,
      headers: {
        cookie: `${SESSION_COOKIE}=${createSessionToken(userId, BOT_TOKEN)}`,
        ...(origin ? { origin } : {}),
      },
    });

  it('accepts a valid cookie for reads and same-origin writes', () => {
    expect(authenticate(request('GET'))).toBe(USER_ID);
    expect(authenticate(request('POST', USER_ID, 'https://app.example.com'))).toBe(USER_ID);
  });

  it('blocks cross-site writes, missing cookies and other users', () => {
    expect(() => authenticate(request('POST', USER_ID, 'https://evil.example'))).toThrow(/Cross-site/);
    expect(() => authenticate(request('DELETE'))).toThrow(/Cross-site/);
    expect(() => authenticate(new Request('https://app.example.com/api/admin/stats'))).toThrow(/credentials/);
    expect(() => authenticate(request('GET', 42))).toThrow(/not allowed/);
  });
});
