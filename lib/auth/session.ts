import { createHmac } from 'node:crypto';
import { safeEqual } from '@/lib/auth/safe-equal';

/** httpOnly cookie that lets the web admin work in a normal browser (outside Telegram). */
export const SESSION_COOKIE = 'tvr_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Keyed off BOT_TOKEN, so rotating the token in BotFather also logs out every browser. */
function sign(payload: string, botToken: string): string {
  const key = createHmac('sha256', 'TvrWebSession').update(botToken).digest();
  return createHmac('sha256', key).update(payload).digest('hex');
}

/** Token format: `<userId>.<expiresAtSeconds>.<hmac>`. */
export function createSessionToken(userId: number, botToken: string, now = new Date()): string {
  const expiresAt = Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload, botToken)}`;
}

/** Returns the user id for a valid, unexpired token, otherwise null. */
export function verifySessionToken(token: string | null | undefined, botToken: string, now = new Date()): number | null {
  const match = token ? /^(\d+)\.(\d+)\.([0-9a-f]{64})$/.exec(token) : null;
  if (!match) return null;
  const [, userId = '', expiresAt = '', signature = ''] = match;
  if (!safeEqual(sign(`${userId}.${expiresAt}`, botToken), signature)) return null;
  if (Number(expiresAt) <= Math.floor(now.getTime() / 1000)) return null;
  return Number(userId);
}

export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}
