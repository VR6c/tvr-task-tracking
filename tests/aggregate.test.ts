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

  it('puts Done/Success tasks inside Monday-Sunday into Last Week Achievement', () => {
    expect(sections.achievements).toEqual(expect.arrayContaining([doneMon, successSun, milestone, withIssue]));
    expect(sections.achievements).not.toContain(prevWeekDone);
    expect(sections.achievements).not.toContain(nextWeekDone);
    expect(sections.achievements).not.toContain(feedbackWed);
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
