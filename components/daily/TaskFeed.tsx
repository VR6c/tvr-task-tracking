import { ClipboardList } from 'lucide-react';
import { TaskCard } from '@/components/daily/TaskCard';
import { STATUS_STYLE } from '@/components/daily/status-style';
import { EmptyState } from '@/components/ui/EmptyState';
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { TaskDTO } from '@/types/api';

interface TaskFeedProps {
  tasks: readonly TaskDTO[];
  onStatusChange: (task: TaskDTO, status: TaskStatus) => void;
  onEdit: (task: TaskDTO) => void;
}

export function TaskFeed({ tasks, onStatusChange, onEdit }: TaskFeedProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No tasks logged for this day"
        description="Add your first test above, or message the bot, e.g. “Quick Test v2.5.17 build 668 #success”."
      />
    );
  }

  return (
    <div className="space-y-5">
      {TASK_STATUSES.map((status) => {
        const group = tasks.filter((t) => t.status === status);
        if (group.length === 0) return null;
        const { icon: Icon, text } = STATUS_STYLE[status];
        return (
          <section key={status} aria-labelledby={`group-${status}`}>
            <h2 id={`group-${status}`} className={cn('mb-2 flex items-center gap-1.5 text-sm font-semibold', text)}>
              <Icon aria-hidden className="size-4" />
              {STATUS_LABELS[status]}
              <span className="font-normal text-hint">({group.length})</span>
            </h2>
            <ul className="space-y-2">
              {group.map((task) => (
                <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} onEdit={onEdit} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
