import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api/errors';
import { assertCronSecret } from '@/lib/auth/secrets';
import { getDb } from '@/lib/db/client';
import { listCarryOvers, listOpenToday } from '@/lib/db/tasks';
import { getEnv } from '@/lib/env';
import { toTaskDTO } from '@/lib/tasks';
import { getTelegramApi, openAppKeyboard } from '@/lib/telegram/bot';
import { formatDailyDigest } from '@/lib/telegram/digest';
import { todayInTimezone } from '@/lib/week-utils';

export const dynamic = 'force-dynamic';

/** 08:30 Asia/Phnom_Penh = 01:30 UTC (vercel.json). */
export async function GET(req: Request): Promise<Response> {
  try {
    assertCronSecret(req);
    const { ALLOWED_TELEGRAM_USER_ID: userId } = getEnv();
    const date = todayInTimezone();
    const db = getDb();
    const [carryOvers, today] = await Promise.all([listCarryOvers(db, userId, date), listOpenToday(db, userId, date)]);
    await getTelegramApi().sendMessage(
      userId,
      formatDailyDigest(date, carryOvers.map(toTaskDTO), today.map(toTaskDTO)),
      { parse_mode: 'Markdown', reply_markup: openAppKeyboard('Open today', '/daily') },
    );
    return NextResponse.json({ sent: true, date, carryOvers: carryOvers.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
