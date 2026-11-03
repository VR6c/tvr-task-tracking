import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateInitData } from '@/lib/auth/init-data';

const BOT_TOKEN = '123456789:AAH-test-token';
const NOW = new Date('2026-11-03T03:00:00.000Z');
const nowSeconds = Math.floor(NOW.getTime() / 1000);

function sign(fields: Record<string, string>, token = BOT_TOKEN): string {
  const check = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

const base = () => ({
  auth_date: String(nowSeconds - 60),
  query_id: 'AAE',
  user: JSON.stringify({ id: 100200300, first_name: 'Thary', username: 'tvr' }),
});

describe('validateInitData (FR-AUTH-01)', () => {
  it('accepts correctly signed data and returns the user id', () => {
    expect(validateInitData(sign(base()), BOT_TOKEN, { now: NOW })).toEqual({
      ok: true,
      userId: 100200300,
      authDate: nowSeconds - 60,
    });
  });

  it('accepts a "tma " prefix', () => {
    expect(validateInitData(`tma ${sign(base())}`, BOT_TOKEN, { now: NOW }).ok).toBe(true);
  });

  it('rejects data signed with a different bot token', () => {
    expect(validateInitData(sign(base(), '999:other'), BOT_TOKEN, { now: NOW })).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects tampered payloads', () => {
    const tampered = sign(base()).replace('100200300', '100200301');
    expect(validateInitData(tampered, BOT_TOKEN, { now: NOW })).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects expired auth_date', () => {
    const old = sign({ ...base(), auth_date: String(nowSeconds - 3 * 86_400) });
    expect(validateInitData(old, BOT_TOKEN, { now: NOW })).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects missing, malformed and hash-less input', () => {
    expect(validateInitData(undefined, BOT_TOKEN)).toEqual({ ok: false, reason: 'missing' });
    expect(validateInitData('   ', BOT_TOKEN)).toEqual({ ok: false, reason: 'missing' });
    expect(validateInitData('auth_date=1&user=%7B%7D', BOT_TOKEN)).toEqual({ ok: false, reason: 'malformed' });
    expect(validateInitData('hash=zz', BOT_TOKEN)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a valid signature without a usable user', () => {
    const noUser = sign({ auth_date: String(nowSeconds) });
    expect(validateInitData(noUser, BOT_TOKEN, { now: NOW })).toEqual({ ok: false, reason: 'no_user' });
  });
});
