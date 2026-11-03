import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { safeEqual } from '@/lib/auth/safe-equal';

/** Telegram recommends rejecting stale initData; 24h still covers a long-lived Mini App session. */
export const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

const userSchema = z.object({ id: z.number().int().positive() }).passthrough();

export type InitDataFailure = 'missing' | 'malformed' | 'bad_signature' | 'expired' | 'no_user';
export type InitDataResult =
  | { ok: true; userId: number; authDate: number }
  | { ok: false; reason: InitDataFailure };

/**
 * FR-AUTH-01: validate Telegram `initData` (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
 * secret = HMAC_SHA256(key="WebAppData", msg=BOT_TOKEN); hash = HMAC_SHA256(key=secret, msg=data_check_string).
 */
export function validateInitData(
  raw: string | null | undefined,
  botToken: string,
  options: { now?: Date; maxAgeSeconds?: number } = {},
): InitDataResult {
  const value = raw?.trim().replace(/^tma\s+/i, '');
  if (!value) return { ok: false, reason: 'missing' };

  const params = new URLSearchParams(value);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return { ok: false, reason: 'malformed' };
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, val]) => `${key}=${val}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!safeEqual(expected, hash.toLowerCase())) return { ok: false, reason: 'bad_signature' };

  const authDate = Number(params.get('auth_date'));
  if (!Number.isInteger(authDate) || authDate <= 0) return { ok: false, reason: 'malformed' };
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  if (nowSeconds - authDate > (options.maxAgeSeconds ?? INIT_DATA_MAX_AGE_SECONDS)) {
    return { ok: false, reason: 'expired' };
  }

  let userJson: unknown;
  try {
    userJson = JSON.parse(params.get('user') ?? '');
  } catch {
    return { ok: false, reason: 'no_user' };
  }
  const user = userSchema.safeParse(userJson);
  if (!user.success) return { ok: false, reason: 'no_user' };

  return { ok: true, userId: user.data.id, authDate };
}
