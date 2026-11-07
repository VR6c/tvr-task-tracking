import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { signJwt, verifyJwt, type SessionClaims } from '@/lib/auth/jwt';
import { isProduction, type ServerEnv } from '@/lib/env';

/** httpOnly cookie holding the web-admin JWT, so the app works in a normal browser (outside Telegram). */
export const SESSION_COOKIE = 'tvr_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** JWT_SECRET when set; otherwise derived from BOT_TOKEN (rotating either logs every browser out). */
export function sessionSecret(env: Pick<ServerEnv, 'JWT_SECRET' | 'BOT_TOKEN'>): string {
  return env.JWT_SECRET ?? createHmac('sha256', 'TvrWebSession').update(env.BOT_TOKEN).digest('hex');
}

export function createSessionToken(claims: Omit<SessionClaims, 'iat' | 'exp'>, secret: string, now = new Date()): string {
  return signJwt(claims, secret, SESSION_MAX_AGE_SECONDS, now);
}

export function verifySessionToken(token: string | null | undefined, secret: string, now = new Date()): SessionClaims | null {
  return verifyJwt(token, secret, now);
}

export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

const cookieOptions = () => ({ httpOnly: true, secure: isProduction(), sameSite: 'lax', path: '/' }) as const;

/** 200 with the token (for `Authorization: Bearer` use) plus the same token as the browser session cookie. */
export function sessionResponse(token: string, now = new Date()): NextResponse {
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  const response = NextResponse.json({ token, expiresAt });
  response.cookies.set(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_MAX_AGE_SECONDS });
  return response;
}

export function clearSessionResponse(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  return response;
}
