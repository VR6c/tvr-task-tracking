import { CATEGORY_LABELS, STATUS_LABELS, isCompletedStatus } from '@/lib/constants';
import { inline } from '@/lib/formatters/escape';
import { formatDateLong } from '@/lib/week-utils';
import type { TaskDTO } from '@/types/api';

/** Telegram rejects messages over 4096 characters; stay safely below it. */
export const TELEGRAM_MESSAGE_LIMIT = 4000;

/** End-of-day report: every task scheduled for `date`, in the order it was logged, with its status. */
export function formatDailyTaskList(date: string, tasks: readonly TaskDTO[]): string {
  const heading = `*List all task today (${formatDateLong(date)})*`;
  if (tasks.length === 0) return `${heading}\n\nNo tasks were logged today.`;

  const done = tasks.filter((t) => isCompletedStatus(t.status)).length;
  const lines = tasks.map((task, index) => {
    const meta = [CATEGORY_LABELS[task.category], task.buildVersion].filter(Boolean).join(' · ');
    const remark = (task.issueRemark ?? '').trim();
    return [
      `${index + 1}. ${inline(task.title)}`,
      `   ${inline(meta)} — *${STATUS_LABELS[task.status]}*${task.isOverDeadline ? ' (over deadline)' : ''}`,
      remark ? `   Issue: ${inline(remark)}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [heading, `${done}/${tasks.length} tasks done`, '', ...lines].join('\n');
}

/** Splits on line boundaries so no chunk exceeds `limit` and no list item is cut in half. */
export function chunkMessage(text: string, limit: number = TELEGRAM_MESSAGE_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > limit && current) {
      chunks.push(current);
      current = line.slice(0, limit);
    } else {
      current = candidate.slice(0, limit);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
