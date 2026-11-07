import { describe, expect, it } from 'vitest';
import { formatDailyDigest, formatWeeklyReminder, waitingLabel } from '@/lib/telegram/digest';
import { aggregateWeek } from '@/lib/weekly-aggregate';
import { weekRange } from '@/lib/week-utils';
import { makeTask } from './factories';

describe('formatDailyDigest', () => {
  it('lists carry-over priorities with their original dates', () => {
    const text = formatDailyDigest('2026-11-03', [makeTask({ title: 'Retest login', scheduledDate: '2026-10-30' })], []);
    expect(text).toContain('*Carry-over priorities* (1)');
    expect(text).toContain('• Retest login — Quick Test _(waiting 4 days)_');
    expect(text).toContain('1 task(s) still open.');
  });

  it('shows planned tasks for today and handles an empty backlog', () => {
    const text = formatDailyDigest('2026-11-03', [], [makeTask({ title: 'Smoke 2.6' })]);
    expect(text).toContain('Nothing carried over');
    expect(text).toContain('*Already planned today* (1)');
    expect(text).toContain('• Smoke 2.6 — Quick Test _(today)_');
    expect(formatDailyDigest('2026-11-03', [], [])).toContain('No open tasks');
  });

  it('caps long lists', () => {
    const many = Array.from({ length: 20 }, () => makeTask({ scheduledDate: '2026-10-30' }));
    expect(formatDailyDigest('2026-11-03', many, [])).toContain('…and 5 more');
  });
});

describe('waitingLabel', () => {
  it('words the age of a pending task', () => {
    expect(waitingLabel('2026-11-03', '2026-11-03')).toBe('today');
    expect(waitingLabel('2026-11-02', '2026-11-03')).toBe('waiting 1 day');
    expect(waitingLabel('2026-10-01', '2026-11-03')).toBe('waiting 33 days');
  });
});

describe('formatWeeklyReminder', () => {
  const range = weekRange('2026-11-06');
  const sections = aggregateWeek([makeTask({ status: 'Done', scheduledDate: '2026-11-03' })], range);

  it('reports GCIN progress for the week', () => {
    const base = { weekStartDate: range.start, weekEndDate: range.end, sections };
    const none = formatWeeklyReminder({ ...base, gcin: { good: '', challenge: '', improvement: '', nextAction: '' } });
    expect(none).toContain('Week 45');
    expect(none).toContain('GCIN entries recorded: 0/4');
    expect(none).toContain('Completed this week: 1');
    const all = formatWeeklyReminder({ ...base, gcin: { good: 'a', challenge: 'b', improvement: 'c', nextAction: 'd' } });
    expect(all).toContain('All four GCIN entries are recorded');
  });
});
