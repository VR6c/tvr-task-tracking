'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { InlineError, Section } from '@/components/admin/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/client/api-client';
import { haptic } from '@/lib/client/telegram';
import { useResource } from '@/lib/client/use-resource';
import type { AdminJobResult, AdminJobsResponse } from '@/types/api';

export function JobsSection() {
  const toast = useToast();
  const [running, setRunning] = useState<string | null>(null);
  const jobs = useResource<AdminJobsResponse>('admin:jobs', (signal) =>
    apiFetch<AdminJobsResponse>('/api/admin/jobs', { signal }),
  );

  const run = async (key: string, label: string) => {
    if (!window.confirm(`Run "${label}" now?`)) return;
    setRunning(key);
    try {
      await apiFetch<AdminJobResult>(`/api/admin/jobs/${key}`, { method: 'POST' });
      haptic('success');
      toast.show(`${label} done`);
    } catch (error) {
      haptic('error');
      toast.show(errorMessage(error), 'error');
    } finally {
      setRunning(null);
    }
  };

  return (
    <Section id="admin-jobs" title="Scheduled jobs">
      {jobs.error ? (
        <InlineError message={jobs.error} onRetry={jobs.reload} />
      ) : !jobs.data ? (
        <Skeleton className="h-40" />
      ) : (
        <ul className="space-y-2">
          {jobs.data.jobs.map((job) => (
            <li key={job.key} className="flex items-center gap-3 rounded-lg border border-separator bg-surface p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{job.label}</p>
                <p className="text-xs text-hint">{job.schedule} (Phnom Penh)</p>
              </div>
              <button
                type="button"
                onClick={() => run(job.key, job.label)}
                disabled={running !== null}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg disabled:opacity-60"
              >
                <Send aria-hidden className="size-4" />
                {running === job.key ? 'Running...' : 'Run now'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
