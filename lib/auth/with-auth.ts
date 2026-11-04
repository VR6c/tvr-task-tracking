import type { NextRequest } from 'next/server';
import { ApiError, toErrorResponse } from '@/lib/api/errors';
import { validateInitData } from '@/lib/auth/init-data';
import { readCookie, SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { getEnv, isProduction } from '@/lib/env';

/**
 * Dev-only escape hatch so the app can be exercised in a normal browser:
 *   Authorization: dev-mock            -> acts as ALLOWED_TELEGRAM_USER_ID
 *   Authorization: dev-mock:<userId>   -> acts as any user (to test the 403 path)
 * Never honoured when NODE_ENV === 'production'.
 */
const DEV_MOCK = /^dev-mock(?::(\d+))?$/;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Cookie-authenticated writes must come from this app's own pages (CSRF guard; SameSite=Lax is the first line). */
function assertSameOrigin(req: Request): void {
  if (SAFE_METHODS.has(req.method)) return;
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(req.url).origin) throw ApiError.forbidden('Cross-site request blocked');
}

/**
 * FR-AUTH-01/02/03: the Mini App sends initData in the Authorization header; a browser (web admin) sends the
 * session cookie set by /api/auth/telegram instead. 401 = bad credentials, 403 = wrong Telegram user.
 */
export function authenticate(req: Request): number {
  const env = getEnv();
  const header = req.headers.get('authorization');

  let userId: number;
  const mock = !isProduction() && header ? DEV_MOCK.exec(header.trim()) : null;
  if (mock) {
    userId = mock[1] ? Number(mock[1]) : env.ALLOWED_TELEGRAM_USER_ID;
  } else if (!header) {
    const sessionUserId = verifySessionToken(readCookie(req, SESSION_COOKIE), env.BOT_TOKEN);
    if (sessionUserId === null) throw ApiError.unauthorized();
    assertSameOrigin(req);
    userId = sessionUserId;
  } else {
    const result = validateInitData(header, env.BOT_TOKEN);
    if (!result.ok) throw ApiError.unauthorized();
    userId = result.userId;
  }

  if (userId !== env.ALLOWED_TELEGRAM_USER_ID) throw ApiError.forbidden();
  return userId;
}

type RouteContext<P> = { params: Promise<P> };
type AuthedHandler<P> = (req: NextRequest, ctx: { userId: number; params: P }) => Promise<Response>;

/** Wrap every /api/* handler (except the bot webhook and cron routes, which use their own secrets). */
export function withAuth<P extends Record<string, string> = Record<string, never>>(handler: AuthedHandler<P>) {
  return async (req: NextRequest, route: RouteContext<P>): Promise<Response> => {
    try {
      const userId = authenticate(req);
      const params = await route.params;
      return await handler(req, { userId, params });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
