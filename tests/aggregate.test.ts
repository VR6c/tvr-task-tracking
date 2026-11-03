import { describe, expect, it } from 'vitest';
import { aggregateWeek } from '@/lib/weekly-aggregate';
import { weekRange } from '@/lib/week-utils';
import { makeTask } from './factories';

const range = weekRange('2026-11-03'); // Mon 2 Nov - Sun 8 Nov

describe('aggregateWeek (FR-WK-01)', () => {
  const doneMon = makeTask({ status: 'Done', scheduledDate: '2026-11-02' });
  const successSun = makeTask({ status: 'Success', scheduledDate: '2026-11-08' });
  const feedbackWed = makeTask({ status: 'Feedback', scheduledDate: '2026-11-04' });
  const carryOver = makeTask({ status: 'Feedback', scheduledDate: '2026-10-29' });
  const prevWeekDone = makeTask({ status: 'Done', scheduledDate: '2026-11-01' });
  const nextWeekDone = makeTask({ status: 'Done', scheduledDate: '2026-11-09' });
  const testFlight = makeTask({ status: 'Feedback', environment: 'TestFlight', scheduledDate: '2026-11-05' });
  const milestone = makeTask({ status: 'Success', category: 'milestone_feature', scheduledDate: '2026-11-06' });
  const openMilestone = makeTask({ status: 'Feedback', category: 'milestone_feature', scheduledDate: '2026-11-06' });
  const withIssue = makeTask({ status: 'Done', issueRemark: 'Crash on login', scheduledDate: '2026-11-03' });
  const blankIssue = makeTask({ status: 'Done', issueRemark: '   ', scheduledDate: '2026-11-03' });

  const all = [
    doneMon,
    successSun,
    feedbackWed,
    carryOver,
    prevWeekDone,
    nextWeekDone,
    testFlight,
    milestone,
    openMilestone,
    withIssue,
    blankIssue,
  ];
  const sections = aggregateWeek(all, range);

  it('puts every task inside Monday-Sunday into Last Week Achievement, whatever its status', () => {
    expect(sections.achievements).toEqual(
      expect.arrayContaining([doneMon, successSun, milestone, withIssue, feedbackWed, testFlight]),
    );
    expect(sections.achievements).not.toContain(prevWeekDone);
    expect(sections.achievements).not.toContain(nextWeekDone);
    expect(sections.achievements).not.toContain(carryOver);
  });

  it('plans Feedback tasks plus carry-overs from earlier weeks', () => {
    expect(sections.plan).toEqual(expect.arrayContaining([feedbackWed, carryOver, testFlight, openMilestone]));
    expect(sections.plan.every((t) => t.status === 'Feedback')).toBe(true);
    expect(sections.plan[0]).toBe(carryOver); // oldest first
  });

  it('tracks TestFlight builds and signed-off milestones only', () => {
    expect(sections.tracking).toEqual([testFlight, milestone]);
  });

  it('registers only tasks with a non-blank issue remark', () => {
    expect(sections.issues).toEqual([withIssue]);
  });
});

describe('aggregateWeek: one task logged on several days', () => {
  const mon = makeTask({ title: 'Task A', status: 'Feedback', scheduledDate: '2026-11-02' });
  const tue = makeTask({ title: 'task a ', status: 'Feedback', scheduledDate: '2026-11-03' });
  const wed = makeTask({ title: 'Task A', status: 'Done', scheduledDate: '2026-11-04' });

  it('counts it once and takes the status of the latest entry', () => {
    const { achievements, plan } = aggregateWeek([mon, tue, wed], range);
    expect(achievements).toEqual([wed]);
    expect(plan).toEqual([]);
  });

  it('keeps it in the plan while the latest entry is still Feedback', () => {
    const { achievements, plan } = aggregateWeek([mon, tue], range);
    expect(achievements).toEqual([tue]);
    expect(plan).toEqual([tue]);
  });

  it('drops an earlier-week carry-over once it is finished inside the window', () => {
    const carry = makeTask({ title: 'Task A', status: 'Feedback', scheduledDate: '2026-10-29' });
    const { achievements, plan } = aggregateWeek([carry, wed], range);
    expect(achievements).toEqual([wed]);
    expect(plan).toEqual([]);
  });

  it('does not merge different titles', () => {
    const other = makeTask({ title: 'Task B', status: 'Feedback', scheduledDate: '2026-11-03' });
    expect(aggregateWeek([wed, other], range).achievements).toEqual([other, wed]);
  });
});
