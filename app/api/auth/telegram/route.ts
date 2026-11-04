import { NextResponse } from 'next/server';
import { ApiError, readJson, toErrorResponse } from '@/lib/api/errors';
import { validateLoginWidget } from '@/lib/auth/login-widget';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { getEnv, isProduction } from '@/lib/env';

export const dynamic = 'force-dynamic';

const cookieOptions = { httpOnly: true, secure: isProduction(), sameSite: 'lax', path: '/' } as const;

/** Exchanges Telegram Login Widget data for a 7-day session cookie (web admin in a normal browser). */
export async function POST(req: Request): Promise<Response> {
  try {
    const env = getEnv();
    const result = validateLoginWidget(await readJson(req), env.BOT_TOKEN);
    if (!result.ok) throw ApiError.unauthorized('Telegram login could not be verified. Please try again.');
    if (result.userId !== env.ALLOWED_TELEGRAM_USER_ID) throw ApiError.forbidden();

    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(SESSION_COOKIE, createSessionToken(result.userId, env.BOT_TOKEN), {
      ...cookieOptions,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Logout. */
export async function DELETE(): Promise<Response> {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
