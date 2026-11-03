'use client';

import { InlineError, Section } from '@/components/admin/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/client/api-client';
import { useResource } from '@/lib/client/use-resource';
import { CATEGORY_LABELS, TASK_CATEGORIES, TASK_STATUSES } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { formatMonthLabel } from '@/lib/week-utils';
import type { AdminStatsResponse } from '@/types/api';

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'danger' }) {
  return (
    <div className="rounded-lg border border-separator bg-surface p-3">
      <dd className={cn('text-2xl font-bold tabular-nums', value > 0 && tone === 'warn' && 'text-warn', value > 0 && tone === 'danger' && 'text-danger')}>
        {value}
      </dd>
      <dt className="mt-0.5 text-xs text-hint">{label}</dt>
    </div>
  );
}

export function StatsSection() {
  const stats = useResource<AdminStatsResponse>('admin:stats', (signal) =>
    apiFetch<AdminStatsResponse>('/api/admin/stats', { signal }),
  );
  const data = stats.data;

  return (
    <Section id="admin-stats" title="Overview">
      {stats.error ? (
        <InlineError message={stats.error} onRetry={stats.reload} />
      ) : !data ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Total tasks" value={data.totals.tasks} />
            <Stat label={formatMonthLabel(data.month)} value={data.totals.thisMonth} />
            <Stat label="Open (Feedback)" value={data.totals.open} />
            <Stat label="Carry-overs" value={data.totals.openCarryOvers} tone="warn" />
            <Stat label="Over deadline" value={data.totals.overDeadline} tone="danger" />
            <Stat label="Done" value={data.byStatus.Done} />
            <Stat label="Success" value={data.byStatus.Success} />
            <Stat label="Weekly reviews" value={data.totals.weeklyReviews} />
          </dl>
          <div className="rounded-lg border border-separator bg-surface p-3">
            <h3 className="text-sm font-semibold">{formatMonthLabel(data.month)} by category</h3>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {TASK_CATEGORIES.map((category) => (
                <li key={category} className="flex justify-between">
                  <span className="text-hint">{CATEGORY_LABELS[category]}</span>
                  <span className="font-semibold tabular-nums">{data.byCategory[category]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-hint">
              {TASK_STATUSES.map((s) => `${s} ${data.byStatus[s]}`).join(' · ')}
              {data.lastTaskAt && ` · Last task ${new Date(data.lastTaskAt).toLocaleString()}`}
            </p>
          </div>
        </div>
      )}
    </Section>
  );
}
