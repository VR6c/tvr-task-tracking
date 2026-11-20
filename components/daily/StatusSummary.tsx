import { STATUS_STYLE } from '@/components/daily/status-style';
import { STATUS_LABELS, TASK_STATUSES } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { TaskDTO } from '@/types/api';

/** One tile per status with its count; scannable at a glance on phones, roomy on desktop. */
export function StatusSummary({ tasks }: { tasks: readonly TaskDTO[] }) {
  return (
    <ul aria-label="Tasks by status" className="grid grid-cols-4 gap-2 lg:gap-4">
      {TASK_STATUSES.map((status) => {
        const { icon: Icon, text, soft } = STATUS_STYLE[status];
        const count = tasks.filter((t) => t.status === status).length;
        return (
          <li key={status} className="flex flex-col gap-1 rounded-xl border border-separator bg-bg p-2.5 lg:flex-row lg:items-center lg:gap-3 lg:p-4">
            <span className={cn('grid size-7 place-items-center rounded-lg lg:size-10', soft, text)}>
              <Icon aria-hidden className="size-4 lg:size-5" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-xl font-bold tabular-nums lg:text-2xl">{count}</p>
              <p className="truncate text-[11px] text-hint lg:text-xs">{STATUS_LABELS[status]}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
