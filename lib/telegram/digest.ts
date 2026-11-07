import { inline } from '@/lib/formatters/escape';
import { taskLine } from '@/lib/formatters/standup';
import { countCompleted } from '@/lib/tasks';
import { daysBetween, formatDateLong, formatRangeShort, isoWeekNumber, weekRange } from '@/lib/week-utils';
import type { TaskDTO, WeeklyResponse } from '@/types/api';

const MAX_LISTED = 15;

/** "today", "waiting 1 day", "waiting 4 days" - how long a task has been sitting open. */
export function waitingLabel(scheduledDate: string, today: string): string {
  const days = daysBetween(scheduledDate, today);
  if (days <= 0) return 'today';
  return `waiting ${days} ${days === 1 ? 'day' : 'days'}`;
}

function listed(tasks: readonly TaskDTO[], today: string): string[] {
  const lines = tasks.slice(0, MAX_LISTED).map((t) => `${taskLine(t)} _(${waitingLabel(t.scheduledDate, today)})_`);
  if (tasks.length > MAX_LISTED) lines.push(`…and ${tasks.length - MAX_LISTED} more`);
  return lines;
}

/** FR-BOT-03: 08:30 reminder - every task still open (Plan or Feedback), oldest first, with how long it has been waiting. */
export function formatDailyDigest(date: string, carryOvers: readonly TaskDTO[], today: readonly TaskDTO[]): string {
  const lines = [`*Good morning — ${formatDateLong(date)}*`, ''];
  if (carryOvers.length === 0 && today.length === 0) {
    lines.push('No open tasks. Log today\'s first test to get started.');
    return lines.join('\n');
  }
  lines.push(`${carryOvers.length + today.length} task(s) still open.`, '');
  if (carryOvers.length) {
    lines.push(`*Carry-over priorities* (${carryOvers.length})`, ...listed(carryOvers, date), '');
  } else {
    lines.push('Nothing carried over from earlier days.', '');
  }
  if (today.length) lines.push(`*Already planned today* (${today.length})`, ...listed(today, date));
  return lines.join('\n').trimEnd();
}

/** FR-BOT-03: weekly reminder (Saturday 10:00) to record GCIN. */
export function formatWeeklyReminder(view: WeeklyResponse): string {
  const range = weekRange(view.weekStartDate);
  const filled = Object.values(view.gcin).filter((v) => v.trim().length > 0).length;
  const status =
    filled === 4
      ? 'All four GCIN entries are recorded — review them before the meeting.'
      : `GCIN entries recorded: ${filled}/4. Capture Good, Challenge, Improvement and Next Action while it is fresh.`;
  return [
    `*Weekly GCIN reminder — Week ${isoWeekNumber(range.start)}* (${inline(formatRangeShort(range))})`,
    '',
    `Completed this week: ${countCompleted(view.sections.achievements)} · Still open: ${view.sections.plan.length} · Issues logged: ${view.sections.issues.length}`,
    status,
  ].join('\n');
}
