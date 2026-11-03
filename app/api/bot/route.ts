import { toErrorResponse } from '@/lib/api/errors';
import { assertWebhookSecret } from '@/lib/auth/secrets';
import { getWebhookHandler } from '@/lib/telegram/bot';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Telegram webhook receiver (FR-BOT-01/02). Requests must carry the secret token set via setWebhook. */
export async function POST(req: Request): Promise<Response> {
  try {
    assertWebhookSecret(req);
    return await getWebhookHandler()(req);
  } catch (error) {
    return toErrorResponse(error);
  }
}
