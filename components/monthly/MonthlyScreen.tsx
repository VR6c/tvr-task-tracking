'use client';

import { useId, useState } from 'react';
import { AuditSection } from '@/components/monthly/AuditSection';
import { KpiCard } from '@/components/monthly/KpiCard';
import { NarrativeBlocks } from '@/components/monthly/NarrativeBlocks';
import { PeriodNav } from '@/components/PeriodNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/client/api-client';
import { useResource } from '@/lib/client/use-resource';
import { useToday } from '@/lib/client/use-today';
import { formatMonthLabel, monthYearOf, shiftMonth } from '@/lib/week-utils';
import type { MonthlyResponse } from '@/types/api';

function monthOptions(current: string, selected: string): string[] {
  const months = new Set<string>([selected]);
  for (let offset = -12; offset <= 1; offset += 1) months.add(shiftMonth(current, offset));
  return [...months].sort().reverse();
}

export function MonthlyScreen() {
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const selectId = useId();
  const currentMonth = today ? monthYearOf(today) : null;
  const month = picked ?? currentMonth;

  const resource = useResource<MonthlyResponse>(month ? `monthly:${month}` : null, (signal) =>
    apiFetch<MonthlyResponse>(`/api/monthly/kpi?month=${month}`, { signal }),
  );

  return (
    <>
      <ScreenHeader title="Monthly KPI" subtitle="2026 individual targets">
        {month && currentMonth && (
          <PeriodNav
            label={
              <>
                <label htmlFor={selectId} className="sr-only">
                  Select month
                </label>
                <select
                  id={selectId}
                  value={month}
                  onChange={(e) => setPicked(e.target.value)}
                  className="min-h-11 w-full rounded-lg bg-transparent text-center text-[15px] font-semibold"
                >
                  {monthOptions(currentMonth, month).map((option) => (
                    <option key={option} value={option}>
                      {formatMonthLabel(option)}
                    </option>
                  ))}
                </select>
              </>
            }
            prevLabel="Previous month"
            nextLabel="Next month"
            onPrev={() => setPicked(shiftMonth(month, -1))}
            onNext={() => setPicked(shiftMonth(month, 1))}
          />
        )}
      </ScreenHeader>

      {resource.error ? (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      ) : resource.loading || !resource.data ? (
        <SkeletonList rows={5} label="Loading monthly KPIs" />
      ) : (
        <div className="space-y-6">
          <ul aria-label="KPI results" className="space-y-3">
            {resource.data.kpis.map((kpi) => (
              <KpiCard key={kpi.key} kpi={kpi} weeksInMonth={resource.data?.weeksInMonth ?? 4} />
            ))}
          </ul>
          <AuditSection audit={resource.data.audit} />
          <NarrativeBlocks key={resource.data.month} month={resource.data.month} server={resource.data.narrative} />
        </div>
      )}
    </>
  );
}
