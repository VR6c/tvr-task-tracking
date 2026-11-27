import { STATUS_STYLE } from '@/components/daily/status-style';
import { CATEGORY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { formatDateShort } from '@/lib/week-utils';
import type { TaskDTO } from '@/types/api';

export function MonthTaskList({ tasks }: { tasks: readonly TaskDTO[] }) {
  return (
    <section aria-labelledby="month-tasks-heading" className="space-y-2">
      <h2 id="month-tasks-heading" className="flex items-center gap-2 text-base font-bold">
        Tasks this month
        <span className="ml-auto text-lg font-bold tabular-nums">{tasks.length}</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="rounded-xl border border-separator bg-bg p-3 text-sm text-hint">No tasks this month.</p>
      ) : (
        <ul className="divide-y divide-separator rounded-xl border border-separator bg-bg px-3">
          {tasks.map((task) => {
            const { icon: Icon, text, soft } = STATUS_STYLE[task.status];
            return (
              <li key={task.id} className="flex items-start gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium leading-snug">{task.title}</p>
                  <p className="mt-0.5 text-xs text-hint">
                    {CATEGORY_LABELS[task.category]} · {formatDateShort(task.scheduledDate)}
                  </p>
                </div>
                <span
                  className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', soft, text)}
                >
                  <Icon aria-hidden className="size-3" />
                  {task.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
