import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api/errors';
import { assertCronSecret } from '@/lib/auth/secrets';
import { getDb } from '@/lib/db/client';
import { listTasksByDate } from '@/lib/db/tasks';
import { getEnv } from '@/lib/env';
import { toTaskDTO } from '@/lib/tasks';
import { getTelegramApi, openAppKeyboard } from '@/lib/telegram/bot';
import { chunkMessage, formatDailyTaskList } from '@/lib/telegram/daily-report';
import { todayInTimezone } from '@/lib/week-utils';

export const dynamic = 'force-dynamic';

/** 17:00 Asia/Phnom_Penh = 10:00 UTC (vercel.json). Sends "List all task today (date)". */
export async function GET(req: Request): Promise<Response> {
  try {
    assertCronSecret(req);
    const { ALLOWED_TELEGRAM_USER_ID: userId } = getEnv();
    const date = todayInTimezone();
    const tasks = (await listTasksByDate(getDb(), userId, date)).map(toTaskDTO);
    const chunks = chunkMessage(formatDailyTaskList(date, tasks));
    const api = getTelegramApi();

    for (const [index, text] of chunks.entries()) {
      const isLast = index === chunks.length - 1;
      await api.sendMessage(userId, text, {
        parse_mode: 'Markdown',
        ...(isLast ? { reply_markup: openAppKeyboard('Open today', '/daily') } : {}),
      });
    }
    return NextResponse.json({ sent: true, date, tasks: tasks.length, messages: chunks.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
