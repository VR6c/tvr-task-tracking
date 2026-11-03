import { CheckCircle2, Clock4 } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/constants';
import { formatDateShort } from '@/lib/week-utils';
import type { DeadlineAudit, TaskDTO } from '@/types/api';

function AuditList({ title, tasks, tone }: { title: string; tasks: readonly TaskDTO[]; tone: 'ok' | 'danger' }) {
  const Icon = tone === 'ok' ? CheckCircle2 : Clock4;
  return (
    <details className="rounded-lg border border-separator bg-surface" open={tasks.length > 0 && tasks.length <= 5}>
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-3 text-sm font-semibold">
        <Icon aria-hidden className={tone === 'ok' ? 'size-4 text-ok' : 'size-4 text-danger'} />
        {title}
        <span className="ml-auto text-lg font-bold tabular-nums">{tasks.length}</span>
      </summary>
      {tasks.length === 0 ? (
        <p className="px-3 pb-3 text-sm text-hint">No tasks in this list.</p>
      ) : (
        <ul className="divide-y divide-separator px-3 pb-1">
          {tasks.map((task) => (
            <li key={task.id} className="py-2">
              <p className="break-words text-sm font-medium leading-snug">{task.title}</p>
              <p className="mt-0.5 text-xs text-hint">
                {CATEGORY_LABELS[task.category]} · {formatDateShort(task.scheduledDate)} · {task.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export function AuditSection({ audit }: { audit: DeadlineAudit }) {
  return (
    <section aria-labelledby="audit-heading" className="space-y-2">
      <h2 id="audit-heading" className="text-base font-bold">
        Deadline audit
      </h2>
      <AuditList title="Complete on time" tasks={audit.onTime} tone="ok" />
      <AuditList title="Overdeadline" tasks={audit.overDeadline} tone="danger" />
    </section>
  );
}
