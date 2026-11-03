import { isCompletedStatus, type TaskCategory } from '@/lib/constants';
import { KPI_DEFINITIONS, type KpiDefinition, type KpiStatus } from '@/lib/kpi/config';
import { countWeeksInMonth } from '@/lib/week-utils';
import type { DeadlineAudit, KpiItemResult, TaskDTO } from '@/types/api';

type CountableTask = Pick<TaskDTO, 'category' | 'status' | 'monthYear'>;
export type MonthlyTallies = Map<string, Partial<Record<TaskCategory, number>>>;

/**
 * FR-MO-02 non-duplication: tallies are keyed by the task's own month_year (derived from its
 * scheduled date), so a task contributes to exactly one month no matter when its status changes.
 */
export function tallyByMonth(tasks: readonly CountableTask[]): MonthlyTallies {
  const tallies: MonthlyTallies = new Map();
  for (const task of tasks) {
    if (!isCompletedStatus(task.status)) continue;
    const month = tallies.get(task.monthYear) ?? {};
    month[task.category] = (month[task.category] ?? 0) + 1;
    tallies.set(task.monthYear, month);
  }
  return tallies;
}

export function resolveTargets(def: KpiDefinition, weeksInMonth: number): { good: number; excellence: number } {
  const multiplier = def.period === 'week' ? weeksInMonth : 1;
  return { good: def.good * multiplier, excellence: def.excellence * multiplier };
}

export function kpiStatus(actual: number, good: number, excellence: number): KpiStatus {
  if (actual >= excellence) return 'Excellence';
  if (actual >= good) return 'Good';
  return 'Under';
}

/** FR-MO-01: actual vs Good/Excellence targets for one month. */
export function computeKpis(
  tasks: readonly CountableTask[],
  month: string,
): { weeksInMonth: number; kpis: KpiItemResult[] } {
  const weeksInMonth = countWeeksInMonth(month);
  const tally = tallyByMonth(tasks).get(month) ?? {};
  const kpis = KPI_DEFINITIONS.map((def): KpiItemResult => {
    const { good, excellence } = resolveTargets(def, weeksInMonth);
    const actual = tally[def.category] ?? 0;
    return {
      key: def.key,
      label: def.label,
      category: def.category,
      period: def.period,
      actual,
      good,
      excellence,
      status: kpiStatus(actual, good, excellence),
    };
  });
  return { weeksInMonth, kpis };
}

/**
 * FR-MO-03: "Overdeadline" = flagged tasks (any status); "Complete on time" = finished tasks
 * that were never flagged. Open, unflagged tasks are not audited yet.
 */
export function auditDeadlines(tasks: readonly TaskDTO[], month: string): DeadlineAudit {
  const inMonth = tasks.filter((t) => t.monthYear === month);
  return {
    onTime: inMonth.filter((t) => !t.isOverDeadline && isCompletedStatus(t.status)),
    overDeadline: inMonth.filter((t) => t.isOverDeadline),
  };
}
