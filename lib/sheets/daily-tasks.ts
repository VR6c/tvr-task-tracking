import { CATEGORY_LABELS, ENVIRONMENT_LABELS } from '@/lib/constants';
import { getSheetsConfig, sheetsFetch, type SheetsConfig } from '@/lib/sheets/client';
import type { TaskDTO } from '@/types/api';

export const SHEET_HEADER = [
  'Date',
  'Task',
  'Category',
  'Environment',
  'Status',
  'Build',
  'Over deadline',
  'Issue',
  'Completed at',
  'Task ID',
] as const;

const ID_COLUMN = 'J';

export function taskToRow(task: TaskDTO): string[] {
  return [
    task.scheduledDate,
    task.title,
    CATEGORY_LABELS[task.category],
    ENVIRONMENT_LABELS[task.environment],
    task.status,
    task.buildVersion ?? '',
    task.isOverDeadline ? 'Yes' : 'No',
    task.issueRemark ?? '',
    task.completedAt ?? '',
    task.id,
  ];
}

const quoted = (tab: string): string => `'${tab.replace(/'/g, "''")}'`;

async function ensureTab(config: SheetsConfig): Promise<void> {
  const meta = await sheetsFetch<{ sheets?: { properties: { title: string } }[] }>(config, '?fields=sheets.properties.title');
  if (meta.sheets?.some((s) => s.properties.title === config.tab)) return;
  await sheetsFetch(config, ':batchUpdate', {
    method: 'POST',
    body: { requests: [{ addSheet: { properties: { title: config.tab, gridProperties: { frozenRowCount: 1 } } } }] },
  });
}

async function readColumn(config: SheetsConfig, range: string): Promise<string[]> {
  const result = await sheetsFetch<{ values?: string[][] }>(
    config,
    `/values/${encodeURIComponent(range)}?majorDimension=COLUMNS`,
  );
  return result.values?.[0] ?? [];
}

export interface SheetSyncResult {
  updated: number;
  appended: number;
}

/**
 * Upserts tasks by Task ID: existing rows are rewritten in place (so a status change updates the same
 * row), new tasks are appended. Rows of tasks deleted in the app are left untouched.
 * Values are written RAW so a title like "=SUM(A1)" stays text.
 */
export async function syncTasksToSheet(tasks: readonly TaskDTO[], config: SheetsConfig = getSheetsConfig()): Promise<SheetSyncResult> {
  await ensureTab(config);
  const tab = quoted(config.tab);

  const ids = await readColumn(config, `${tab}!${ID_COLUMN}1:${ID_COLUMN}`);
  if (ids[0] !== SHEET_HEADER[SHEET_HEADER.length - 1]) {
    await sheetsFetch(config, `/values/${encodeURIComponent(`${tab}!A1`)}?valueInputOption=RAW`, {
      method: 'PUT',
      body: { values: [[...SHEET_HEADER]] },
    });
  }

  // Row numbers are 1-based; the header occupies row 1.
  const rowById = new Map<string, number>();
  ids.forEach((id, index) => {
    if (index > 0 && id) rowById.set(id, index + 1);
  });

  const updates: { range: string; values: string[][] }[] = [];
  const appends: string[][] = [];
  for (const task of tasks) {
    const row = rowById.get(task.id);
    if (row) updates.push({ range: `${tab}!A${row}:${ID_COLUMN}${row}`, values: [taskToRow(task)] });
    else appends.push(taskToRow(task));
  }

  if (updates.length) {
    await sheetsFetch(config, '/values:batchUpdate', {
      method: 'POST',
      body: { valueInputOption: 'RAW', data: updates },
    });
  }
  if (appends.length) {
    await sheetsFetch(config, `/values/${encodeURIComponent(`${tab}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: { values: appends },
    });
  }
  return { updated: updates.length, appended: appends.length };
}
