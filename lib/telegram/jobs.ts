import { getDb } from '@/lib/db/client';
import { listCarryOvers, listOpenToday, listTasksByDate } from '@/lib/db/tasks';
import { loadWeeklyView } from '@/lib/db/views';
import { getEnv } from '@/lib/env';
import { toTaskDTO } from '@/lib/tasks';
import { getTelegramApi, openAppKeyboard } from '@/lib/telegram/bot';
import { chunkMessage, formatDailyTaskList } from '@/lib/telegram/daily-report';
import { formatDailyDigest, formatWeeklyReminder } from '@/lib/telegram/digest';
import { todayInTimezone, weekRange } from '@/lib/week-utils';

/** Scheduled Telegram messages. Run by the cron routes and by the admin dashboard's "Run now". */
export const JOB_KEYS = ['daily-digest', 'daily-report', 'weekly-reminder'] as const;
export type JobKey = (typeof JOB_KEYS)[number];

export const JOB_LABELS: Record<JobKey, { label: string; schedule: string }> = {
  'daily-digest': { label: 'Daily digest', schedule: 'Every day 08:30' },
  'daily-report': { label: 'Daily task report', schedule: 'Every day 17:00' },
  'weekly-reminder': { label: 'Weekly GCIN reminder', schedule: 'Saturday 10:00' },
};

export const isJobKey = (value: string): value is JobKey => (JOB_KEYS as readonly string[]).includes(value);

async function dailyDigest(userId: number) {
  const date = todayInTimezone();
  const db = getDb();
  const [carryOvers, today] = await Promise.all([listCarryOvers(db, userId, date), listOpenToday(db, userId, date)]);
  await getTelegramApi().sendMessage(
    userId,
    formatDailyDigest(date, carryOvers.map(toTaskDTO), today.map(toTaskDTO)),
    { parse_mode: 'Markdown', reply_markup: openAppKeyboard('Open today', '/daily') },
  );
  return { sent: true, date, carryOvers: carryOvers.length };
}

async function dailyReport(userId: number) {
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
  return { sent: true, date, tasks: tasks.length, messages: chunks.length };
}

async function weeklyReminder(userId: number) {
  const range = weekRange(todayInTimezone());
  const view = await loadWeeklyView(getDb(), userId, range.start, range.end);
  await getTelegramApi().sendMessage(userId, formatWeeklyReminder(view), {
    parse_mode: 'Markdown',
    reply_markup: openAppKeyboard('Record GCIN', '/weekly'),
  });
  return { sent: true, weekStart: range.start };
}

const RUNNERS: Record<JobKey, (userId: number) => Promise<Record<string, unknown>>> = {
  'daily-digest': dailyDigest,
  'daily-report': dailyReport,
  'weekly-reminder': weeklyReminder,
};

/** Sends the job's message to the allowed Telegram user and returns a small summary. */
export function runJob(key: JobKey): Promise<Record<string, unknown>> {
  return RUNNERS[key](getEnv().ALLOWED_TELEGRAM_USER_ID);
}
