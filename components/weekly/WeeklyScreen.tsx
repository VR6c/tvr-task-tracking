'use client';

import { useState } from 'react';
import { PeriodNav } from '@/components/PeriodNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { WeeklyBody } from '@/components/weekly/WeeklyBody';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/client/api-client';
import { useResource } from '@/lib/client/use-resource';
import { useToday } from '@/lib/client/use-today';
import { addDays, formatWeekLabel, shiftWeek, startOfWeek } from '@/lib/week-utils';
import type { WeeklyResponse } from '@/types/api';

export function WeeklyScreen() {
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const weekStart = picked ?? (today ? startOfWeek(today) : null);
  const weekEnd = weekStart ? addDays(weekStart, 6) : null;
  const thisWeek = today ? startOfWeek(today) : null;

  const resource = useResource<WeeklyResponse>(weekStart ? `weekly:${weekStart}` : null, (signal) =>
    apiFetch<WeeklyResponse>(`/api/weekly?startDate=${weekStart}&endDate=${weekEnd}`, { signal }),
  );

  return (
    <>
      <ScreenHeader title="Weekly review" subtitle="Monday – Sunday, auto-aggregated">
        {weekStart && (
          <>
            <PeriodNav
              label={formatWeekLabel(weekStart)}
              prevLabel="Previous week"
              nextLabel="Next week"
              onPrev={() => setPicked(shiftWeek(weekStart, -1))}
              onNext={() => setPicked(shiftWeek(weekStart, 1))}
            />
            {weekStart !== thisWeek && (
              <button type="button" onClick={() => setPicked(null)} className="min-h-11 w-full text-sm font-medium text-link">
                Jump to this week
              </button>
            )}
          </>
        )}
      </ScreenHeader>

      {resource.error ? (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      ) : resource.loading || !resource.data ? (
        <SkeletonList rows={5} label="Loading weekly review" />
      ) : (
        <WeeklyBody key={resource.data.weekStartDate} view={resource.data} />
      )}
    </>
  );
}
