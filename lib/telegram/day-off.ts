import type { DayOffRow } from '@/db/schema';
import { addDays, isValidIsoDate } from '@/lib/week-utils';

export interface ParsedDayOff {
  kind: DayOffRow['kind'];
  date: string;
  /** Leave only: "2h", "morning", "afternoon" or "full day". */
  detail: string | null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const FILLER = new Set(['on', 'for', 'is', 'a', 'an', 'the', 'day', 'off', 'at', 'i', 'am', 'will', 'be', 'take', 'taking', 'm', 'have']);

const pad = (n: number): string => String(n).padStart(2, '0');

function isoOrNull(year: number, month: number, day: number): string | null {
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return isValidIsoDate(iso) ? iso : null;
}

/**
 * Recognises short messages such as "today holiday", "tomorrow leave morning", "leave 2h",
 * "holiday 2026-11-10" or "leave full day 10 nov". Returns null when the message has any other
 * words, so ordinary task messages are never mistaken for a day off.
 */
export function parseDayOffMessage(raw: string, today: string): ParsedDayOff | null {
  let text = ` ${raw.toLowerCase().replace(/[,!]|\.(?!\d)/g, ' ')} `;
  if (text.trim().startsWith('/')) return null;

  const kind = /\bholidays?\b/.test(text) ? 'holiday' : /\bleave\b/.test(text) ? 'leave' : null;
  if (!kind) return null;
  text = text.replace(/\b(holidays?|leave)\b/, ' ');

  let detail: string | null = null;
  if (kind === 'leave') {
    const hours = /\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/.exec(text);
    if (hours) {
      detail = `${hours[1]}h`;
      text = text.replace(hours[0], ' ');
    } else if (/\bmorning\b/.test(text)) {
      detail = 'morning';
      text = text.replace(/\bmorning\b/, ' ');
    } else if (/\bafternoon\b/.test(text)) {
      detail = 'afternoon';
      text = text.replace(/\bafternoon\b/, ' ');
    } else {
      text = text.replace(/\b(?:full|whole|all)\s+day\b|\bfull\b/, ' ');
      detail = 'full day';
    }
  }

  let date: string | null = null;
  const take = (pattern: RegExp, resolve: (m: RegExpExecArray) => string | null): boolean => {
    const m = pattern.exec(text);
    if (!m) return false;
    date = resolve(m);
    text = text.replace(m[0], ' ');
    return true;
  };
  const year = Number(today.slice(0, 4));

  [
    () => take(/\btoday\b/, () => today),
    () => take(/\btomorrow\b/, () => addDays(today, 1)),
    () => take(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, (m) => isoOrNull(+m[1]!, +m[2]!, +m[3]!)),
    () => take(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/, (m) => isoOrNull(m[3] ? +m[3] : year, +m[2]!, +m[1]!)),
    () => take(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*(?:\s+(\d{4}))?\b/, (m) => {
      const month = MONTHS.indexOf(m[2]!);
      return month < 0 ? null : isoOrNull(m[3] ? +m[3] : year, month + 1, +m[1]!);
    }),
    () => take(/\b([a-z]{3})[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?\b/, (m) => {
      const month = MONTHS.indexOf(m[1]!);
      return month < 0 ? null : isoOrNull(m[3] ? +m[3] : year, month + 1, +m[2]!);
    }),
  ].some((attempt) => attempt());

  // Anything left that is not filler means this is a regular task message.
  if (text.split(/\s+/).some((word) => word && !FILLER.has(word))) return null;
  // A date-like token that failed to resolve (e.g. 31/02) must not silently become today.
  if (date === null && /\d/.test(raw.replace(/\d+(?:\.\d+)?\s*(?:h|hr|hrs|hour|hours)\b/i, ''))) return null;

  return { kind, date: date ?? today, detail };
}

/** "Holiday" or "Leave (morning)". */
export function dayOffLabel(kind: ParsedDayOff['kind'], detail: string | null): string {
  return kind === 'holiday' ? 'Holiday' : `Leave${detail ? ` (${detail})` : ''}`;
}
