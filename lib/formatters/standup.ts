import { CATEGORY_LABELS, isCompletedStatus } from '@/lib/constants';
import { inline } from '@/lib/formatters/escape';
import { formatDateLong } from '@/lib/week-utils';
import type { TaskDTO } from '@/types/api';

export function taskLine(task: TaskDTO, options: { withRemark?: boolean } = {}): string {
  const meta = [CATEGORY_LABELS[task.category], task.buildVersion].filter(Boolean).join(' · ');
  const base = `• ${inline(task.title)} — ${inline(meta)}`;
  const remark = (task.issueRemark ?? '').trim();
  return options.withRemark && remark ? `${base}\n   ↳ ${inline(remark)}` : base;
}

function section(heading: string, lines: string[]): string {
  return [`*${heading}* (${lines.length})`, ...(lines.length ? lines : ['_None_'])].join('\n');
}

/** FR-DAY-03: Telegram Markdown standup grouped Success/Completed, Feedback/Pending, Blockers & Issues. */
export function formatDailyStandup(date: string, tasks: readonly TaskDTO[]): string {
  const completed = tasks.filter((t) => isCompletedStatus(t.status));
  const pending = tasks.filter((t) => t.status === 'Feedback');
  const issues = tasks.filter((t) => (t.issueRemark ?? '').trim().length > 0);

  return [
    `*Daily Standup — ${formatDateLong(date)}*`,
    '',
    section('✅ Success / Completed', completed.map((t) => taskLine(t))),
    '',
    section('⏳ Feedback / Pending', pending.map((t) => taskLine(t))),
    '',
    section('🚧 Blockers & Issues Logged', issues.map((t) => taskLine(t, { withRemark: true }))),
  ].join('\n');
}
