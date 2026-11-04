/**
 * Syncs a month's tasks into its own tab of the spreadsheet, named
 * "<Mon> - Tasklist(<year>)" (e.g. "Nov - Tasklist(2026)"). The tab is created
 * on first sync, so a new month gets a fresh sheet automatically.
 *
 * Layout (matches the team's manual template):
 *   Row 1  – year, e.g. "2026"
 *   Row 2  – Task list | Priority | Status | Push To | Reason | Timeline | Remark
 *   Row 3  – role label ("QA Tester")
 *   Then one section per day: a "Monday, 02 November 2026" header row followed by task rows.
 *
 * Date headers are styled Ubuntu 12. Days reported from Telegram as a holiday or leave (see
 * lib/telegram/day-off.ts) get a suffix and colour: "<date> - Holiday" on green, or
 * "<date> - Leave (morning)" on yellow, both with black text.
 *
 * Append-only: existing rows are never rewritten, so manual edits (Priority, Reason,
 * Timeline, …) survive. A task counts as present when its title already appears in its
 * date section. Missing tasks fill blank placeholder rows of the section first, then are
 * inserted after the section's last row. A missing date section is added at the end.
 */

import type { DayOffRow } from '@/db/schema';
import { getSheetsConfig, sheetsFetch, type SheetsConfig } from '@/lib/sheets/client';
import { dayOffLabel } from '@/lib/telegram/day-off';
import { MONTH_NAMES } from '@/lib/week-utils';
import type { TaskDTO } from '@/types/api';

export const MONTHLY_SHEET_HEADER = ['Task list', 'Priority', 'Status', 'Push To', 'Reason', 'Timeline', 'Remark'] as const;
export const MONTHLY_ROLE_LABEL = 'QA Tester';

const COL_LAST = 'G';
const COL_LAST_INDEX = 7; // exclusive end index of A–G
const FROZEN_ROWS = 2;

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DATE_HEADER_PATTERN = /^[A-Za-z]+day, \d{2} [A-Za-z]+ \d{4}( - .+)?$/;

const HEADER_FONT = 'Ubuntu';
const HEADER_FONT_SIZE = 12;
const HOLIDAY_BG = { red: 0.576, green: 0.769, blue: 0.49 };
const LEAVE_BG = { red: 1, green: 0.95, blue: 0 };
const BLACK = { red: 0, green: 0, blue: 0 };

const quoted = (tab: string): string => `'${tab.replace(/'/g, "''")}'`;

/** "2026-11" → "Nov - Tasklist(2026)" */
export function monthlyTabName(monthYear: string): string {
  const [yearStr, monthStr] = monthYear.split('-');
  const abbr = MONTH_NAMES[Number(monthStr) - 1]?.slice(0, 3) ?? 'Unk';
  return `${abbr} - Tasklist(${yearStr})`;
}

/** "2026-11-02" → "Monday, 02 November 2026" */
export function dateHeaderLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(Date.UTC(year!, month! - 1, day!));
  return `${WEEKDAY_LONG[d.getUTCDay()]}, ${String(day).padStart(2, '0')} ${MONTH_NAMES[d.getUTCMonth()]} ${year}`;
}

export function taskToMonthlyRow(task: TaskDTO): string[] {
  // Task list | Priority | Status | Push To | Reason | Timeline | Remark
  return [task.title, '', task.status, task.environment, '', '', task.issueRemark ?? ''];
}

/** Ubuntu 12 on a date-header row; a day off also gets a green (holiday) or yellow (leave) background with black text. */
async function styleDateHeader(config: SheetsConfig, rowIndex: number, dayOff: DayOffRow | undefined): Promise<void> {
  const sheetId = await getSheetId(config);
  if (sheetId === undefined) throw new Error(`Sheet tab "${config.tab}" not found`);
  const format = {
    textFormat: { fontFamily: HEADER_FONT, fontSize: HEADER_FONT_SIZE, ...(dayOff ? { foregroundColor: BLACK } : {}) },
    ...(dayOff ? { backgroundColor: dayOff.kind === 'holiday' ? HOLIDAY_BG : LEAVE_BG } : {}),
  };
  const fields = dayOff
    ? 'userEnteredFormat(textFormat(fontFamily,fontSize,foregroundColor),backgroundColor)'
    : 'userEnteredFormat.textFormat(fontFamily,fontSize)';
  await sheetsFetch(config, ':batchUpdate', {
    method: 'POST',
    body: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: COL_LAST_INDEX },
            cell: { userEnteredFormat: format },
            fields,
          },
        },
      ],
    },
  });
}

const isBlankRow = (row: string[] | undefined): boolean => !row || row.every((cell) => !cell?.trim());

async function getSheetId(config: SheetsConfig): Promise<number | undefined> {
  const meta = await sheetsFetch<{ sheets?: { properties: { title: string; sheetId: number } }[] }>(
    config,
    '?fields=sheets.properties(title,sheetId)',
  );
  return meta.sheets?.find((s) => s.properties.title === config.tab)?.properties.sheetId;
}

async function ensureTab(config: SheetsConfig): Promise<void> {
  if ((await getSheetId(config)) !== undefined) return;
  await sheetsFetch(config, ':batchUpdate', {
    method: 'POST',
    body: {
      requests: [{ addSheet: { properties: { title: config.tab, gridProperties: { frozenRowCount: FROZEN_ROWS } } } }],
    },
  });
}

async function readAllRows(config: SheetsConfig): Promise<string[][]> {
  const result = await sheetsFetch<{ values?: string[][] }>(
    config,
    `/values/${encodeURIComponent(`${quoted(config.tab)}!A1:${COL_LAST}`)}`,
  );
  return result.values ?? [];
}

/** Writes `rows` starting at 1-based `startRow`. Values are RAW so a title like "=SUM(A1)" stays text. */
async function writeRows(config: SheetsConfig, startRow: number, rows: string[][]): Promise<void> {
  if (!rows.length) return;
  const range = `${quoted(config.tab)}!A${startRow}:${COL_LAST}${startRow + rows.length - 1}`;
  await sheetsFetch(config, `/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: { values: rows },
  });
}

/** Inserts blank rows after 0-based `afterRowIndex`, then fills them. */
async function insertRowsAfter(config: SheetsConfig, afterRowIndex: number, rows: string[][]): Promise<void> {
  if (!rows.length) return;
  const sheetId = await getSheetId(config);
  if (sheetId === undefined) throw new Error(`Sheet tab "${config.tab}" not found`);
  const startIndex = afterRowIndex + 1;
  await sheetsFetch(config, ':batchUpdate', {
    method: 'POST',
    body: {
      requests: [
        {
          insertDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex, endIndex: startIndex + rows.length },
            inheritFromBefore: true,
          },
        },
      ],
    },
  });
  await writeRows(config, startIndex + 1, rows);
}

export interface MonthlySheetSyncResult {
  tab: string;
  appended: number;
}

/**
 * Append-only sync of `tasks` and `dayOffs` (all in `monthYear`, "YYYY-MM") into that month's tasklist tab.
 * Day-off dates always get a date section, even without tasks; an existing header is relabelled and restyled.
 */
export async function syncTasksToMonthlySheet(
  tasks: readonly TaskDTO[],
  monthYear: string,
  dayOffs: readonly DayOffRow[] = [],
  baseConfig: SheetsConfig = getSheetsConfig(),
): Promise<MonthlySheetSyncResult> {
  const tab = monthlyTabName(monthYear);
  const config: SheetsConfig = { ...baseConfig, tab };

  await ensureTab(config);

  let rows = await readAllRows(config);
  if (rows[1]?.[0] !== MONTHLY_SHEET_HEADER[0]) {
    await writeRows(config, 1, [[monthYear.split('-')[0]!], [...MONTHLY_SHEET_HEADER], [MONTHLY_ROLE_LABEL]]);
  }

  const byDate = new Map<string, TaskDTO[]>();
  for (const task of tasks) byDate.set(task.scheduledDate, [...(byDate.get(task.scheduledDate) ?? []), task]);

  let appended = 0;
  const dayOffByDate = new Map(dayOffs.map((d) => [d.date, d]));
  for (const date of [...new Set([...byDate.keys(), ...dayOffByDate.keys()])].sort()) {
    const tasksToList = byDate.get(date) ?? [];
    const dayOff = dayOffByDate.get(date);
    const dateLabel = dateHeaderLabel(date);
    const label = dayOff ? `${dateLabel} - ${dayOffLabel(dayOff.kind, dayOff.detail)}` : dateLabel;

    // Re-read each time: insertions shift row indices.
    rows = await readAllRows(config);
    const headerIdx = rows.findIndex((r) => r[0]?.trim().startsWith(dateLabel));

    if (headerIdx === -1) {
      await writeRows(config, rows.length + 1, [[label], ...tasksToList.map(taskToMonthlyRow)]);
      await styleDateHeader(config, rows.length, dayOff);
      appended += tasksToList.length;
      continue;
    }

    if (dayOff) {
      await writeRows(config, headerIdx + 1, [[label]]);
      await styleDateHeader(config, headerIdx, dayOff);
    }

    let sectionEnd = rows.length - 1;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      if (DATE_HEADER_PATTERN.test(rows[i]?.[0]?.trim() ?? '')) {
        sectionEnd = i - 1;
        break;
      }
    }

    const existing = new Set<string>();
    const blankIdx: number[] = [];
    for (let i = headerIdx + 1; i <= sectionEnd; i++) {
      const title = rows[i]?.[0]?.trim();
      if (title) existing.add(title.toLowerCase());
      if (isBlankRow(rows[i])) blankIdx.push(i);
    }

    const missing = tasksToList.filter((t) => !existing.has(t.title.trim().toLowerCase())).map(taskToMonthlyRow);
    if (!missing.length) continue;

    // Fill the section's blank placeholder rows first (one write per row), overflow goes after the section.
    const toFill = Math.min(blankIdx.length, missing.length);
    for (let k = 0; k < toFill; k++) await writeRows(config, blankIdx[k]! + 1, [missing[k]!]);
    await insertRowsAfter(config, sectionEnd, missing.slice(toFill));
    appended += missing.length;
  }

  return { tab, appended };
}
