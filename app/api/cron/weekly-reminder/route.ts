import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api/errors';
import { assertCronSecret } from '@/lib/auth/secrets';
import { getDb } from '@/lib/db/client';
import { loadWeeklyView } from '@/lib/db/views';
import { getEnv } from '@/lib/env';
import { getTelegramApi, openAppKeyboard } from '@/lib/telegram/bot';
import { formatWeeklyReminder } from '@/lib/telegram/digest';
import { todayInTimezone, weekRange } from '@/lib/week-utils';

export const dynamic = 'force-dynamic';

/** Friday 16:00 Asia/Phnom_Penh = 09:00 UTC (vercel.json). */
export async function GET(req: Request): Promise<Response> {
  try {
    assertCronSecret(req);
    const { ALLOWED_TELEGRAM_USER_ID: userId } = getEnv();
    const range = weekRange(todayInTimezone());
    const view = await loadWeeklyView(getDb(), userId, range.start, range.end);
    await getTelegramApi().sendMessage(userId, formatWeeklyReminder(view), {
      parse_mode: 'Markdown',
      reply_markup: openAppKeyboard('Record GCIN', '/weekly'),
    });
    return NextResponse.json({ sent: true, weekStart: range.start });
  } catch (error) {
    return toErrorResponse(error);
  }
}
