import { isCompletedStatus } from '@/lib/constants';
import { isInRange, type DateRange } from '@/lib/week-utils';
import type { TaskDTO, WeeklySections } from '@/types/api';

function byScheduleThenCreated(a: TaskDTO, b: TaskDTO): number {
  return a.scheduledDate.localeCompare(b.scheduledDate) || a.createdAt.localeCompare(b.createdAt);
}

/**
 * FR-WK-01: group tasks of a Monday-Sunday window into the four slide sections.
 * Pass the window's tasks plus any still-open tasks scheduled before the window (carry-overs).
 */
export function aggregateWeek(tasks: readonly TaskDTO[], range: DateRange): WeeklySections {
  const sorted = [...tasks].sort(byScheduleThenCreated);
  const inWindow = sorted.filter((t) => isInRange(t.scheduledDate, range));

  return {
    achievements: inWindow.filter((t) => isCompletedStatus(t.status)),
    plan: sorted.filter(
      (t) => t.status === 'Feedback' && (isInRange(t.scheduledDate, range) || t.scheduledDate < range.start),
    ),
    tracking: inWindow.filter(
      (t) => t.environment === 'TestFlight' || (t.category === 'milestone_feature' && isCompletedStatus(t.status)),
    ),
    issues: inWindow.filter((t) => (t.issueRemark ?? '').trim().length > 0),
  };
}
