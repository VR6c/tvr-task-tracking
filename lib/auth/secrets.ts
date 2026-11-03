import { safeEqual } from '@/lib/auth/safe-equal';
import { ApiError } from '@/lib/api/errors';
import { getEnv } from '@/lib/env';

/** Telegram echoes the secret_token given to setWebhook in this header. */
export function assertWebhookSecret(req: Request): void {
  const provided = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!safeEqual(provided, getEnv().WEBHOOK_SECRET)) throw ApiError.unauthorized('Invalid webhook secret');
}

/** Cron routes expect `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron sends). */
export function assertCronSecret(req: Request): void {
  const header = req.headers.get('authorization') ?? '';
  const provided = header.replace(/^Bearer\s+/i, '');
  if (!provided || !safeEqual(provided, getEnv().CRON_SECRET)) throw ApiError.unauthorized('Invalid cron secret');
}
