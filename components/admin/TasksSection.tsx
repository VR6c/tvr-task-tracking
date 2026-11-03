'use client';

import { useEffect, useId, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { InlineError, Section } from '@/components/admin/Section';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/client/api-client';
import { haptic } from '@/lib/client/telegram';
import { useResource } from '@/lib/client/use-resource';
import { CATEGORY_LABELS, ENVIRONMENT_LABELS } from '@/lib/constants';
import { formatDateShort } from '@/lib/week-utils';
import type { AdminTasksResponse, TaskDTO } from '@/types/api';

const SEARCH_DEBOUNCE_MS = 300;

export function TasksSection() {
  const toast = useToast();
  const inputId = useId();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const tasks = useResource<AdminTasksResponse>(`admin:tasks:${query}`, (signal) =>
    apiFetch<AdminTasksResponse>(`/api/admin/tasks?q=${encodeURIComponent(query)}`, { signal }),
  );

  const remove = async (task: TaskDTO) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setDeleting(task.id);
    try {
      await apiFetch<void>(`/api/admin/tasks/${task.id}`, { method: 'DELETE' });
      tasks.mutate((current) => ({ tasks: current.tasks.filter((t) => t.id !== task.id) }));
      haptic('success');
      toast.show('Task deleted');
    } catch (error) {
      haptic('error');
      toast.show(errorMessage(error), 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Section id="admin-tasks" title="Tasks">
      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          Search tasks by title
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
        <input
          id={inputId}
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by title"
          className="min-h-11 w-full rounded-lg border border-separator bg-surface pl-9 pr-3 text-[15px]"
        />
      </div>

      {tasks.error ? (
        <InlineError message={tasks.error} onRetry={tasks.reload} />
      ) : !tasks.data ? (
        <SkeletonList rows={4} label="Loading tasks" />
      ) : tasks.data.tasks.length === 0 ? (
        <EmptyState icon={Search} title="No tasks found" description={query ? 'Try a different search.' : 'Nothing logged yet.'} />
      ) : (
        <>
          <ul className="space-y-2">
            {tasks.data.tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 rounded-lg border border-separator bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[15px] font-medium leading-snug">{task.title}</p>
                  <p className="mt-1 text-xs text-hint">
                    {[formatDateShort(task.scheduledDate), CATEGORY_LABELS[task.category], ENVIRONMENT_LABELS[task.environment], task.status]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(task)}
                  disabled={deleting === task.id}
                  aria-label={`Delete task: ${task.title}`}
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-danger disabled:opacity-50"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-center text-xs text-hint">Showing the 50 most recent matches.</p>
        </>
      )}
    </Section>
  );
}
