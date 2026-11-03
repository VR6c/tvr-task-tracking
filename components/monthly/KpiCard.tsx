import { ThumbsUp, Trophy, TrendingDown, type LucideIcon } from 'lucide-react';
import { KPI_STATUS_LABELS, type KpiStatus } from '@/lib/kpi/config';
import { cn } from '@/lib/cn';
import type { KpiItemResult } from '@/types/api';

const STATUS_STYLE: Record<KpiStatus, { icon: LucideIcon; text: string; badge: string; bar: string }> = {
  Excellence: { icon: Trophy, text: 'text-ok', badge: 'bg-ok/15 text-ok', bar: 'bg-ok' },
  Good: { icon: ThumbsUp, text: 'text-warn', badge: 'bg-warn/15 text-warn', bar: 'bg-warn' },
  Under: { icon: TrendingDown, text: 'text-danger', badge: 'bg-danger/15 text-danger', bar: 'bg-danger' },
};

export function KpiCard({ kpi, weeksInMonth }: { kpi: KpiItemResult; weeksInMonth: number }) {
  const style = STATUS_STYLE[kpi.status];
  const Icon = style.icon;
  const fill = Math.min(100, (kpi.actual / kpi.excellence) * 100);
  const goodMark = (kpi.good / kpi.excellence) * 100;

  return (
    <li className="rounded-xl border border-separator bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{kpi.label}</h3>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', style.badge)}>
          <Icon aria-hidden className="size-3.5" />
          {KPI_STATUS_LABELS[kpi.status]}
        </span>
      </div>

      <p className="mt-2 flex items-baseline gap-1.5">
        <span className={cn('text-3xl font-bold tabular-nums', style.text)}>{kpi.actual}</span>
        <span className="text-sm text-hint">actual this month</span>
      </p>

      <div
        role="progressbar"
        aria-label={`${kpi.label}: ${kpi.actual} of ${kpi.excellence} for Excellence`}
        aria-valuemin={0}
        aria-valuemax={kpi.excellence}
        aria-valuenow={Math.min(kpi.actual, kpi.excellence)}
        className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-hint/20"
      >
        <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${fill}%` }} />
        <div aria-hidden className="absolute inset-y-0 w-0.5 bg-fg/60" style={{ left: `${goodMark}%` }} />
      </div>

      <dl className="mt-2 flex justify-between text-xs text-hint">
        <div>
          <dt className="inline">Good: </dt>
          <dd className="inline font-semibold text-fg">{kpi.good}</dd>
        </div>
        <div>
          <dt className="inline">Excellence: </dt>
          <dd className="inline font-semibold text-fg">{kpi.excellence}</dd>
        </div>
      </dl>
      {kpi.period === 'week' && (
        <p className="mt-1 text-xs text-hint">Weekly target × {weeksInMonth} weeks in this month</p>
      )}
    </li>
  );
}
