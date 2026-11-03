import { describe, expect, it } from 'vitest';
import {
  addDays,
  countWeeksInMonth,
  formatDateLong,
  formatMonthLabel,
  formatWeekLabel,
  isoWeekNumber,
  isValidIsoDate,
  isWeekRange,
  monthRange,
  shiftMonth,
  startOfWeek,
  todayInTimezone,
  weekRange,
} from '@/lib/week-utils';

describe('week boundaries (Monday-Sunday)', () => {
  it('maps every day of a week to the same Monday-Sunday window', () => {
    for (const day of ['2026-10-26', '2026-10-28', '2026-11-01']) {
      expect(weekRange(day)).toEqual({ start: '2026-10-26', end: '2026-11-01' });
    }
  });

  it('puts Sunday at the end of the week and Monday at the start of the next', () => {
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02');
  });

  it('crosses month and year boundaries', () => {
    expect(weekRange('2026-12-31')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('validates week ranges strictly', () => {
    expect(isWeekRange('2026-10-26', '2026-11-01')).toBe(true);
    expect(isWeekRange('2026-10-27', '2026-11-02')).toBe(false);
    expect(isWeekRange('2026-10-26', '2026-10-31')).toBe(false);
  });

  it('computes ISO week numbers including year edges', () => {
    expect(isoWeekNumber('2026-11-02')).toBe(45);
    expect(isoWeekNumber('2026-10-26')).toBe(44);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2027-01-01')).toBe(53);
  });

  it('rejects impossible dates', () => {
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('26-01-01')).toBe(false);
    expect(isValidIsoDate('2026-02-28')).toBe(true);
  });
});

describe('month helpers', () => {
  it('rolls months over years in both directions', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 14)).toBe('2027-12');
  });

  it('knows month ranges including leap February', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2028-02').end).toBe('2028-02-29');
  });

  it('counts reporting weeks as Mondays in the month', () => {
    expect(countWeeksInMonth('2026-10')).toBe(4); // 5, 12, 19, 26
    expect(countWeeksInMonth('2026-11')).toBe(5); // 2, 9, 16, 23, 30
  });
});

describe('labels and time zone', () => {
  it('formats labels without locale dependence', () => {
    expect(formatMonthLabel('2026-10')).toBe('October 2026');
    expect(formatDateLong('2026-11-03')).toBe('Tue, Nov 3 2026');
    expect(formatWeekLabel('2026-10-26')).toBe('Week 44 (Oct 26 - Nov 1)');
  });

  it('resolves "today" in Asia/Phnom_Penh (UTC+7)', () => {
    expect(todayInTimezone(new Date('2026-11-02T17:30:00Z'))).toBe('2026-11-03');
    expect(todayInTimezone(new Date('2026-11-02T16:59:00Z'))).toBe('2026-11-02');
  });
});
