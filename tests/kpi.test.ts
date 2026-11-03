import { describe, expect, it } from 'vitest';
import type { TaskCategory } from '@/lib/constants';
import { auditDeadlines, computeKpis, kpiStatus, tallyByMonth } from '@/lib/kpi/engine';
import { makeTask } from './factories';

const done = (category: TaskCategory, date = '2026-10-10') =>
  makeTask({ category, status: 'Done', scheduledDate: date });

function kpi(result: ReturnType<typeof computeKpis>, key: string) {
  const item = result.kpis.find((k) => k.key === key);
  if (!item) throw new Error(`missing kpi ${key}`);
  return item;
}

describe('kpiStatus thresholds', () => {
  it('returns Under below Good, Good at Good, Excellence at Excellence', () => {
    expect(kpiStatus(2, 3, 4)).toBe('Under');
    expect(kpiStatus(3, 3, 4)).toBe('Good');
    expect(kpiStatus(4, 3, 4)).toBe('Excellence');
    expect(kpiStatus(9, 3, 4)).toBe('Excellence');
  });
});

describe('computeKpis', () => {
  it('uses the SRS monthly targets', () => {
    const result = computeKpis([], '2026-10');
    expect(result.kpis.map((k) => [k.key, k.good, k.excellence])).toEqual([
      ['quick_test', 3, 4],
      ['production_error', 4, 12],
      ['new_feature', 4, 6],
      ['new_idea', 1, 3],
      ['research_doc', 1, 2],
    ]);
    expect(result.kpis.every((k) => k.status === 'Under')).toBe(true);
  });

  it('scales the weekly production-error target by the weeks in the month', () => {
    const october = kpi(computeKpis([], '2026-10'), 'production_error');
    const november = kpi(computeKpis([], '2026-11'), 'production_error');
    expect([october.good, october.excellence]).toEqual([4, 12]);
    expect([november.good, november.excellence]).toEqual([5, 15]);
  });

  it('counts only finished tasks of the requested month', () => {
    const tasks = [
      done('quick_test'),
      done('quick_test'),
      makeTask({ category: 'quick_test', status: 'Success', scheduledDate: '2026-10-20' }),
      makeTask({ category: 'quick_test', status: 'Feedback', scheduledDate: '2026-10-21' }),
      done('quick_test', '2026-11-02'),
    ];
    const quickTest = kpi(computeKpis(tasks, '2026-10'), 'quick_test');
    expect(quickTest.actual).toBe(3);
    expect(quickTest.status).toBe('Good');
  });

  it('reaches Excellence at the excellence target', () => {
    const tasks = Array.from({ length: 4 }, () => done('quick_test'));
    expect(kpi(computeKpis(tasks, '2026-10'), 'quick_test').status).toBe('Excellence');
  });
});

describe('non-duplication across months (FR-MO-02)', () => {
  it('counts a task in the month it was scheduled, never again in the next', () => {
    // Scheduled in October, finished (status updated) in November.
    const task = makeTask({
      category: 'milestone_feature',
      status: 'Success',
      scheduledDate: '2026-10-30',
      completedAt: '2026-11-03T02:00:00.000Z',
    });
    const october = kpi(computeKpis([task], '2026-10'), 'new_feature').actual;
    const november = kpi(computeKpis([task], '2026-11'), 'new_feature').actual;
    expect(october).toBe(1);
    expect(november).toBe(0);
    expect(october + november).toBe(1);
  });

  it('groups tallies by month_year', () => {
    const tallies = tallyByMonth([done('idea_propose', '2026-10-31'), done('idea_propose', '2026-11-01')]);
    expect(tallies.get('2026-10')?.idea_propose).toBe(1);
    expect(tallies.get('2026-11')?.idea_propose).toBe(1);
  });
});

describe('auditDeadlines (FR-MO-03)', () => {
  it('splits finished on-time work from over-deadline tasks and ignores other months', () => {
    const onTime = makeTask({ status: 'Done', scheduledDate: '2026-10-05' });
    const late = makeTask({ status: 'Done', isOverDeadline: true, scheduledDate: '2026-10-06' });
    const lateOpen = makeTask({ status: 'Feedback', isOverDeadline: true, scheduledDate: '2026-10-07' });
    const open = makeTask({ status: 'Feedback', scheduledDate: '2026-10-08' });
    const november = makeTask({ status: 'Done', scheduledDate: '2026-11-01' });

    const audit = auditDeadlines([onTime, late, lateOpen, open, november], '2026-10');
    expect(audit.onTime).toEqual([onTime]);
    expect(audit.overDeadline).toEqual([late, lateOpen]);
  });
});
