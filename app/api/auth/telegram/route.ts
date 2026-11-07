import { ApiError, readJson, toErrorResponse } from '@/lib/api/errors';
import { validateLoginWidget } from '@/lib/auth/login-widget';
import { clearSessionResponse, createSessionToken, sessionResponse, sessionSecret } from '@/lib/auth/session';
import { getEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Exchanges Telegram Login Widget data for a 7-day session JWT (web admin in a normal browser). */
export async function POST(req: Request): Promise<Response> {
  try {
    const env = getEnv();
    const body = await readJson(req);
    const result = validateLoginWidget(body, env.BOT_TOKEN);
    if (!result.ok) throw ApiError.unauthorized('Telegram login could not be verified. Please try again.');
    if (result.userId !== env.ALLOWED_TELEGRAM_USER_ID) throw ApiError.forbidden();

    const name = (body as { username?: unknown }).username;
    const token = createSessionToken(
      { sub: `tg:${result.userId}`, uid: result.userId, name: typeof name === 'string' ? name : String(result.userId) },
      sessionSecret(env),
    );
    return sessionResponse(token);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Logout (for either login method). */
export async function DELETE(): Promise<Response> {
  return clearSessionResponse();
}
