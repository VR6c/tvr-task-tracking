import { isCompletedStatus, isOpenStatus } from '@/lib/constants';
import { byScheduleThenCreated, latestPerTitle } from '@/lib/tasks';
import { isInRange, type DateRange } from '@/lib/week-utils';
import type { TaskDTO, WeeklySections } from '@/types/api';

/**
 * FR-WK-01: group tasks of a Monday-Sunday window into the four slide sections.
 * Pass the window's tasks plus any still-open tasks scheduled before the window (carry-overs).
 * Achievements list every task worked on in the window with its latest status (Plan, Feedback, Done or Success);
 * the plan keeps tasks whose latest entry is still open (Plan or Feedback), so a carry-over finished this week drops out.
 */
export function aggregateWeek(tasks: readonly TaskDTO[], range: DateRange): WeeklySections {
  const sorted = [...tasks].sort(byScheduleThenCreated);
  const inWindow = sorted.filter((t) => isInRange(t.scheduledDate, range));

  return {
    achievements: latestPerTitle(inWindow),
    plan: latestPerTitle(sorted.filter((t) => t.scheduledDate <= range.end)).filter((t) => isOpenStatus(t.status)),
    tracking: inWindow.filter(
      (t) => t.environment === 'TestFlight' || (t.category === 'milestone_feature' && isCompletedStatus(t.status)),
    ),
    issues: inWindow.filter((t) => (t.issueRemark ?? '').trim().length > 0),
  };
}
