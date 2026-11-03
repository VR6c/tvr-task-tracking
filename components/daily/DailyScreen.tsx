'use client';

import { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { QuickAddCard } from '@/components/daily/QuickAddCard';
import { TaskEditSheet } from '@/components/daily/TaskEditSheet';
import { TaskFeed } from '@/components/daily/TaskFeed';
import { useTasks } from '@/components/daily/use-tasks';
import { PeriodNav } from '@/components/PeriodNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CopyButton } from '@/components/ui/CopyButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StickyAction } from '@/components/ui/StickyAction';
import { useToday } from '@/lib/client/use-today';
import { formatDailyStandup } from '@/lib/formatters/standup';
import { countCompleted } from '@/lib/tasks';
import { addDays, formatDateLong } from '@/lib/week-utils';

export function DailyScreen() {
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const date = picked ?? today;
  const { resource, addTask, changeStatus, editTask } = useTasks(date);

  if (!date) return <DailySkeleton />;

  const tasks = resource.data?.tasks ?? [];
  const editing = tasks.find((t) => t.id === editingId);
  const isToday = date === today;

  return (
    <>
      <ScreenHeader
        title={isToday ? 'Today' : formatDateLong(date)}
        subtitle={isToday ? formatDateLong(date) : undefined}
        trailing={
          resource.data && (
            <span
              aria-label={`${countCompleted(tasks)} of ${tasks.length} tasks done`}
              className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-ok/15 px-3 text-sm font-semibold text-ok"
            >
              <CalendarCheck aria-hidden className="size-4" />
              {countCompleted(tasks)}/{tasks.length} Tasks Done
            </span>
          )
        }
      >
        <PeriodNav
          label={
            isToday ? (
              'Today'
            ) : (
              <button type="button" onClick={() => setPicked(null)} className="min-h-11 text-link">
                Back to today
              </button>
            )
          }
          prevLabel="Previous day"
          nextLabel="Next day"
          onPrev={() => setPicked(addDays(date, -1))}
          onNext={() => setPicked(addDays(date, 1))}
        />
      </ScreenHeader>

      <div className="space-y-5">
        <QuickAddCard onAdd={addTask} />
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : resource.loading || !resource.data ? (
          <SkeletonList label="Loading tasks" />
        ) : (
          <TaskFeed tasks={tasks} onStatusChange={(t, s) => void changeStatus(t, s)} onEdit={(t) => setEditingId(t.id)} />
        )}
      </div>

      <StickyAction>
        <CopyButton
          label="📋 Copy Daily Standup Report"
          successMessage="Standup report copied"
          disabled={!resource.data}
          getText={() => formatDailyStandup(date, tasks)}
        />
      </StickyAction>

      {editing && (
        <TaskEditSheet task={editing} onSave={(patch) => editTask(editing, patch)} onClose={() => setEditingId(null)} />
      )}
    </>
  );
}

function DailySkeleton() {
  return (
    <div className="pt-6">
      <SkeletonList rows={4} label="Loading" />
    </div>
  );
}
