import type { LucideIcon } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/constants';
import { formatDateShort } from '@/lib/week-utils';
import type { TaskDTO } from '@/types/api';

interface WeeklySectionListProps {
  title: string;
  icon: LucideIcon;
  tasks: readonly TaskDTO[];
  emptyText: string;
  showRemark?: boolean;
}

export function WeeklySectionList({ title, icon: Icon, tasks, emptyText, showRemark }: WeeklySectionListProps) {
  return (
    <section aria-label={title} className="rounded-lg border border-separator bg-surface p-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon aria-hidden className="size-4 text-accent" />
        {title}
        <span className="ml-auto rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-hint">{tasks.length}</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-hint">{emptyText}</p>
      ) : (
        <ul className="mt-2 divide-y divide-separator">
          {tasks.map((task) => (
            <li key={task.id} className="py-2 first:pt-0 last:pb-0">
              <p className="break-words text-sm font-medium leading-snug">{task.title}</p>
              <p className="mt-0.5 text-xs text-hint">
                {[CATEGORY_LABELS[task.category], formatDateShort(task.scheduledDate), task.buildVersion]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {showRemark && task.issueRemark && <p className="mt-1 break-words text-xs text-warn">{task.issueRemark}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
