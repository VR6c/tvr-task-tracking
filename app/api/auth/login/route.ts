import { ApiError, readJson, toErrorResponse } from '@/lib/api/errors';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '@/lib/auth/password';
import { createSessionToken, sessionResponse, sessionSecret } from '@/lib/auth/session';
import { getDb } from '@/lib/db/client';
import { findAdminByUsername, touchAdminLogin } from '@/lib/db/admin-users';
import { getEnv } from '@/lib/env';
import { adminLoginSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Username + password login for admins in the admin_users table (create them with `npm run admin:create`).
 * Returns `{ token, expiresAt }` and sets the same JWT as the session cookie.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const env = getEnv();
    const { username, password } = adminLoginSchema.parse(await readJson(req));
    const db = getDb();
    const admin = await findAdminByUsername(db, username);
    // Always run scrypt so a missing username takes as long as a wrong password.
    const valid = await verifyPassword(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!admin || !valid) throw ApiError.unauthorized('Wrong username or password.');

    await touchAdminLogin(db, admin.id);
    const token = createSessionToken(
      { sub: `admin:${admin.id}`, uid: env.ALLOWED_TELEGRAM_USER_ID, name: admin.username },
      sessionSecret(env),
    );
    return sessionResponse(token);
  } catch (error) {
    return toErrorResponse(error);
  }
}
