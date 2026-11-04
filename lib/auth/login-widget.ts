import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import { safeEqual } from '@/lib/auth/safe-equal';

/** Login data is only exchanged for a session once, right after the widget callback. */
export const LOGIN_MAX_AGE_SECONDS = 10 * 60;

/** Fields the Telegram Login Widget passes to `data-onauth` (https://core.telegram.org/widgets/login). */
export const loginWidgetSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    auth_date: z.coerce.number().int().positive(),
    hash: z.string().regex(/^[0-9a-f]{64}$/i),
  })
  .catchall(z.union([z.string(), z.number()]));

export type LoginWidgetResult =
  | { ok: true; userId: number }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

/**
 * Browser login for the web admin. Differs from initData validation in the key:
 * secret = SHA256(BOT_TOKEN); hash = HMAC_SHA256(key=secret, msg=data_check_string).
 */
export function validateLoginWidget(
  data: unknown,
  botToken: string,
  options: { now?: Date; maxAgeSeconds?: number } = {},
): LoginWidgetResult {
  const parsed = loginWidgetSchema.safeParse(data);
  if (!parsed.success) return { ok: false, reason: 'malformed' };
  const { hash, ...fields } = parsed.data;

  const dataCheckString = Object.entries(fields)
    .filter(([, val]) => val !== undefined && val !== null && val !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, val]) => `${key}=${val}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!safeEqual(expected, hash.toLowerCase())) return { ok: false, reason: 'bad_signature' };

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  if (nowSeconds - fields.auth_date > (options.maxAgeSeconds ?? LOGIN_MAX_AGE_SECONDS)) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, userId: fields.id };
}
