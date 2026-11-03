import { APP_TIMEZONE } from '@/lib/constants';

/**
 * All calendar logic works on plain 'YYYY-MM-DD' / 'YYYY-MM' strings so results never depend on
 * the server or device time zone. Weeks run Monday-Sunday.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface DateRange {
  start: string;
  end: string;
}

function toUtc(date: string): Date {
  const m = ISO_DATE.exec(date);
  if (!m) throw new RangeError(`Invalid date: ${date}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isValidIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return fromUtc(d) === value;
}

export function isValidMonthYear(value: string): boolean {
  const m = ISO_MONTH.exec(value);
  return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

/** Today's calendar date in the app time zone (Asia/Phnom_Penh unless overridden). */
export function todayInTimezone(now: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / MS_PER_DAY);
}

export function addDays(date: string, days: number): string {
  return fromUtc(new Date(toUtc(date).getTime() + days * MS_PER_DAY));
}

/** 0 = Monday ... 6 = Sunday. */
export function mondayIndex(date: string): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: string): string {
  return addDays(date, -mondayIndex(date));
}

export function weekRange(date: string): DateRange {
  const start = startOfWeek(date);
  return { start, end: addDays(start, 6) };
}

export function isWeekRange(start: string, end: string): boolean {
  return isValidIsoDate(start) && isValidIsoDate(end) && mondayIndex(start) === 0 && addDays(start, 6) === end;
}

export function shiftWeek(weekStart: string, weeks: number): string {
  return addDays(weekStart, weeks * 7);
}

/** ISO-8601 week number (week 1 contains the first Thursday of the year). */
export function isoWeekNumber(date: string): number {
  const thursday = toUtc(addDays(startOfWeek(date), 3));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.floor((thursday.getTime() - yearStart) / MS_PER_DAY / 7) + 1;
}

export function isInRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function monthYearOf(date: string): string {
  if (!isValidIsoDate(date)) throw new RangeError(`Invalid date: ${date}`);
  return date.slice(0, 7);
}

function parseMonth(monthYear: string): { year: number; month: number } {
  if (!isValidMonthYear(monthYear)) throw new RangeError(`Invalid month: ${monthYear}`);
  const [y, m] = monthYear.split('-');
  return { year: Number(y), month: Number(m) };
}

export function daysInMonth(monthYear: string): number {
  const { year, month } = parseMonth(monthYear);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthRange(monthYear: string): DateRange {
  return { start: `${monthYear}-01`, end: `${monthYear}-${String(daysInMonth(monthYear)).padStart(2, '0')}` };
}

export function shiftMonth(monthYear: string, months: number): string {
  const { year, month } = parseMonth(monthYear);
  const d = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Reporting weeks in a month = Mondays that fall inside it (4 or 5). Used for the weekly production-error KPI. */
export function countWeeksInMonth(monthYear: string): number {
  const { start, end } = monthRange(monthYear);
  let mondays = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (mondayIndex(d) === 0) mondays += 1;
  }
  return mondays;
}

export function formatMonthLabel(monthYear: string): string {
  const { year, month } = parseMonth(monthYear);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function dayAndMonth(date: string): string {
  const d = toUtc(date);
  return `${MONTH_NAMES[d.getUTCMonth()]?.slice(0, 3)} ${d.getUTCDate()}`;
}

export function formatDateShort(date: string): string {
  return dayAndMonth(date);
}

/** e.g. "Tue, Nov 3 2026" */
export function formatDateLong(date: string): string {
  const d = toUtc(date);
  return `${WEEKDAY_SHORT[d.getUTCDay()]}, ${dayAndMonth(date)} ${d.getUTCFullYear()}`;
}

/** e.g. "Oct 26 - Nov 1" */
export function formatRangeShort(range: DateRange): string {
  return `${dayAndMonth(range.start)} - ${dayAndMonth(range.end)}`;
}

/** e.g. "Week 45 (Nov 2 - Nov 8)" */
export function formatWeekLabel(weekStart: string): string {
  const range = weekRange(weekStart);
  return `Week ${isoWeekNumber(range.start)} (${formatRangeShort(range)})`;
}
