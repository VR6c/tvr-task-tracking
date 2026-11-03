'use client';

import { AlertTriangle, ArrowLeft, Pencil } from 'lucide-react';
import { STATUS_STYLE } from '@/components/daily/status-style';
import { StatusToggle } from '@/components/daily/StatusToggle';
import { useSwipeLeft } from '@/components/daily/use-swipe-left';
import { isTempId } from '@/components/daily/use-tasks';
import { CATEGORY_LABELS, ENVIRONMENT_LABELS, STATUS_LABELS, nextStatus, type TaskStatus } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { TaskDTO } from '@/types/api';

interface TaskCardProps {
  task: TaskDTO;
  onStatusChange: (task: TaskDTO, status: TaskStatus) => void;
  onEdit: (task: TaskDTO) => void;
}

export function TaskCard({ task, onStatusChange, onEdit }: TaskCardProps) {
  const pending = isTempId(task.id);
  const upcoming = nextStatus(task.status);
  const { icon: UpcomingIcon, text: upcomingText, soft: upcomingSoft } = STATUS_STYLE[upcoming];
  const swipe = useSwipeLeft(() => onStatusChange(task, upcoming), !pending);
  const meta = [CATEGORY_LABELS[task.category], ENVIRONMENT_LABELS[task.environment], task.buildVersion].filter(Boolean);

  return (
    <li className="relative overflow-hidden rounded-xl">
      <div
        aria-hidden
        className={cn('absolute inset-0 flex items-center justify-end gap-2 pr-4 text-sm font-semibold', upcomingSoft, upcomingText)}
      >
        <ArrowLeft className="size-4" />
        <UpcomingIcon className="size-4" />
        {STATUS_LABELS[upcoming]}
      </div>
      <div
        {...swipe.handlers}
        style={{ transform: `translateX(${swipe.offset}px)`, touchAction: 'pan-y' }}
        className={cn(
          'relative flex items-start gap-2 rounded-xl border border-separator bg-surface p-3 transition-transform',
          swipe.offset === 0 ? 'duration-200' : 'duration-0',
          pending && 'opacity-70',
        )}
      >
        <StatusToggle status={task.status} disabled={pending} onToggle={() => onStatusChange(task, upcoming)} />
        <div className="min-w-0 flex-1 py-0.5">
          <p className={cn('break-words text-[15px] font-medium leading-snug', task.status !== 'Feedback' && 'text-fg/80')}>
            {task.title}
          </p>
          <p className="mt-1 text-xs text-hint">{meta.join(' · ')}</p>
          {task.issueRemark && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-warn">
              <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
              <span className="break-words">{task.issueRemark}</span>
            </p>
          )}
          {task.isOverDeadline && (
            <p className="mt-1.5 inline-flex rounded bg-danger/15 px-1.5 py-0.5 text-[11px] font-semibold text-danger">
              Over deadline
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onEdit(task)}
          disabled={pending}
          aria-label={`Edit task: ${task.title}`}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-hint disabled:opacity-50"
        >
          <Pencil aria-hidden className="size-4" />
        </button>
      </div>
    </li>
  );
}
