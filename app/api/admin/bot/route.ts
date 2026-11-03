import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/errors';
import { withAuth } from '@/lib/auth/with-auth';
import { getEnv } from '@/lib/env';
import { getTelegramApi } from '@/lib/telegram/bot';
import { syncBot, webhookUrl } from '@/lib/telegram/setup';
import type { AdminBotResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

async function loadBotStatus(): Promise<AdminBotResponse> {
  const api = getTelegramApi();
  try {
    const [me, info] = await Promise.all([api.getMe(), api.getWebhookInfo()]);
    return {
      username: me.username ?? null,
      webhook: {
        url: info.url ?? '',
        expectedUrl: webhookUrl(getEnv().NEXT_PUBLIC_APP_URL),
        pendingUpdates: info.pending_update_count,
        lastError: info.last_error_message ?? null,
        lastErrorAt: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null,
      },
    };
  } catch (error) {
    console.error('Telegram status check failed', error);
    throw ApiError.upstream('Could not reach the Telegram Bot API.');
  }
}

export const GET = withAuth(async () => NextResponse.json(await loadBotStatus()));

/** Re-registers webhook, menu button and commands from the current env (what `npm run bot:setup` does). */
export const POST = withAuth(async () => {
  const { WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL } = getEnv();
  if (!NEXT_PUBLIC_APP_URL.startsWith('https://')) {
    throw ApiError.upstream('NEXT_PUBLIC_APP_URL must be an https URL to register a webhook.');
  }
  try {
    await syncBot(getTelegramApi(), { appUrl: NEXT_PUBLIC_APP_URL, secret: WEBHOOK_SECRET, dropPendingUpdates: false });
  } catch (error) {
    console.error('Bot sync failed', error);
    throw ApiError.upstream('Telegram rejected the bot registration.');
  }
  return NextResponse.json(await loadBotStatus());
});
