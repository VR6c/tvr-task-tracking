import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { safeEqual } from '@/lib/auth/safe-equal';

/** Minimal HS256 JWT. The algorithm is fixed: tokens whose header says anything else are rejected. */
const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

const claimsSchema = z.object({
  /** `admin:<uuid>` for a password login, `tg:<telegram id>` for a Telegram login. */
  sub: z.string().min(1),
  /** Telegram user id whose data the session acts on (always ALLOWED_TELEGRAM_USER_ID). */
  uid: z.number().int().positive(),
  name: z.string(),
  iat: z.number().int(),
  exp: z.number().int(),
});

export type SessionClaims = z.infer<typeof claimsSchema>;

function hmac(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function signJwt(claims: Omit<SessionClaims, 'iat' | 'exp'>, secret: string, ttlSeconds: number, now = new Date()) {
  const iat = Math.floor(now.getTime() / 1000);
  const payload = Buffer.from(JSON.stringify({ ...claims, iat, exp: iat + ttlSeconds })).toString('base64url');
  return `${HEADER}.${payload}.${hmac(`${HEADER}.${payload}`, secret)}`;
}

/** Returns the claims of a correctly signed, unexpired token, otherwise null. */
export function verifyJwt(token: string | null | undefined, secret: string, now = new Date()): SessionClaims | null {
  const parts = token?.split('.');
  if (parts?.length !== 3) return null;
  const [header = '', payload = '', signature = ''] = parts;
  if (header !== HEADER || !safeEqual(hmac(`${header}.${payload}`, secret), signature)) return null;

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const claims = claimsSchema.safeParse(json);
  if (!claims.success || claims.data.exp <= Math.floor(now.getTime() / 1000)) return null;
  return claims.data;
}
