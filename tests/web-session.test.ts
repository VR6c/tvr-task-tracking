import { createHash, createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateLoginWidget } from '@/lib/auth/login-widget';
import { signJwt } from '@/lib/auth/jwt';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSessionToken, readCookie, SESSION_COOKIE, sessionSecret, verifySessionToken } from '@/lib/auth/session';
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

const SECRET = sessionSecret({ BOT_TOKEN, JWT_SECRET: undefined });
const claims = (uid = USER_ID) => ({ sub: 'admin:abc', uid, name: 'admin' });

describe('session JWT', () => {
  it('round-trips and expires after 7 days', () => {
    const token = createSessionToken(claims(), SECRET, NOW);
    expect(token.split('.')).toHaveLength(3);
    expect(verifySessionToken(token, SECRET, NOW)).toMatchObject({ ...claims(), iat: nowSeconds });
    expect(verifySessionToken(token, SECRET, new Date(NOW.getTime() + 8 * 86_400_000))).toBeNull();
  });

  it('uses JWT_SECRET when set', () => {
    expect(sessionSecret({ BOT_TOKEN, JWT_SECRET: 'x'.repeat(32) })).toBe('x'.repeat(32));
    const token = createSessionToken(claims(), 'x'.repeat(32), NOW);
    expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
  });

  it('rejects tampered, foreign and alg-swapped tokens', () => {
    const token = createSessionToken(claims(), SECRET, NOW);
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ ...claims(1), iat: nowSeconds, exp: nowSeconds + 60 })).toString('base64url');
    expect(verifySessionToken(`${header}.${forgedPayload}.${signature}`, SECRET, NOW)).toBeNull();
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    expect(verifySessionToken(`${none}.${forgedPayload}.`, SECRET, NOW)).toBeNull();
    expect(verifySessionToken(signJwt(claims(), 'other-secret', 60, NOW), SECRET, NOW)).toBeNull();
    expect(verifySessionToken('garbage', SECRET, NOW)).toBeNull();
    expect(verifySessionToken(null, SECRET, NOW)).toBeNull();
  });

  it('reads a cookie from the request header', () => {
    const req = new Request('https://app.example.com', { headers: { cookie: `a=1; ${SESSION_COOKIE}=abc; b=2` } });
    expect(readCookie(req, SESSION_COOKIE)).toBe('abc');
    expect(readCookie(req, 'missing')).toBeNull();
  });
});

describe('password hashing', () => {
  it('verifies the right password only', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('wrong password', hash)).toBe(false);
    expect(await verifyPassword('anything', DUMMY_PASSWORD_HASH)).toBe(false);
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });
});

describe('authenticate with a session JWT', () => {
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
        cookie: `${SESSION_COOKIE}=${createSessionToken(claims(userId), SECRET)}`,
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

  it('accepts a Bearer JWT without an Origin (other systems, scripts)', () => {
    const bearer = (token: string) =>
      new Request('https://app.example.com/api/tasks', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    expect(authenticate(bearer(createSessionToken(claims(), SECRET)))).toBe(USER_ID);
    expect(() => authenticate(bearer('nope'))).toThrow(/credentials/);
  });
});
