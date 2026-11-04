import { describe, expect, it } from 'vitest';
import { parseDayOffMessage } from '@/lib/telegram/day-off';

const TODAY = '2026-11-04';
const parse = (text: string) => parseDayOffMessage(text, TODAY);

describe('parseDayOffMessage', () => {
  it('parses holidays for today, tomorrow and explicit dates', () => {
    expect(parse('today holiday')).toEqual({ kind: 'holiday', date: '2026-11-04', detail: null });
    expect(parse('Tomorrow holiday')).toEqual({ kind: 'holiday', date: '2026-11-05', detail: null });
    expect(parse('holiday 2026-11-10')).toEqual({ kind: 'holiday', date: '2026-11-10', detail: null });
    expect(parse('holiday 10/11')).toEqual({ kind: 'holiday', date: '2026-11-10', detail: null });
    expect(parse('holiday on 10 Nov')).toEqual({ kind: 'holiday', date: '2026-11-10', detail: null });
    expect(parse('holiday nov 10')).toEqual({ kind: 'holiday', date: '2026-11-10', detail: null });
  });

  it('parses leave types and defaults to today / full day', () => {
    expect(parse('leave 2h')).toEqual({ kind: 'leave', date: TODAY, detail: '2h' });
    expect(parse('leave 1.5 hours tomorrow')).toEqual({ kind: 'leave', date: '2026-11-05', detail: '1.5h' });
    expect(parse('leave morning')).toEqual({ kind: 'leave', date: TODAY, detail: 'morning' });
    expect(parse('tomorrow leave afternoon')).toEqual({ kind: 'leave', date: '2026-11-05', detail: 'afternoon' });
    expect(parse('leave full day')).toEqual({ kind: 'leave', date: TODAY, detail: 'full day' });
    expect(parse('leave')).toEqual({ kind: 'leave', date: TODAY, detail: 'full day' });
    expect(parse('leave full day 12 nov')).toEqual({ kind: 'leave', date: '2026-11-12', detail: 'full day' });
  });

  it('leaves ordinary task messages and commands alone', () => {
    expect(parse('Test leave request screen v2.5.17')).toBeNull();
    expect(parse('Check holiday calendar feature #done')).toBeNull();
    expect(parse('Quick Test v2.5.17 build 668')).toBeNull();
    expect(parse('/today')).toBeNull();
  });

  it('rejects impossible dates instead of falling back to today', () => {
    expect(parse('holiday 31/02')).toBeNull();
  });
});
