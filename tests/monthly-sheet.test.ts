import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import type { DayOffRow } from '@/db/schema';
import type { SheetsConfig } from '@/lib/sheets/client';
import { dateHeaderLabel, monthlyTabName, syncTasksToMonthlySheet } from '@/lib/sheets/monthly-tasklist';
import { makeTask } from './factories';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const config: SheetsConfig = { email: 'sync@proj.iam.gserviceaccount.com', privateKey, spreadsheetId: 'sheet-1', tab: 'ignored' };

interface Call {
  method: string;
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

function fakeGoogle(rows: string[][]) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { method?: string; body?: unknown } = {}) => {
      const body = typeof init.body === 'string' && !url.includes('oauth2') ? JSON.parse(init.body) : init.body;
      calls.push({ method: init.method ?? 'GET', url: decodeURIComponent(url), body });
      const reply = (json: unknown) => new Response(JSON.stringify(json), { status: 200 });
      if (url.includes('oauth2')) return reply({ access_token: 'tok', expires_in: 3600 });
      if (url.includes('fields=sheets')) return reply({ sheets: [{ properties: { title: 'Nov - Tasklist(2026)', sheetId: 7 } }] });
      if (init.method === 'PUT') return reply({});
      if (url.includes('/values/')) return reply({ values: rows });
      return reply({});
    }),
  );
  return calls;
}

const dayOff = (over: Partial<DayOffRow>): DayOffRow => ({
  id: 'x', telegramUserId: 1, date: '2026-11-04', kind: 'holiday', detail: null, createdAt: new Date(), ...over,
});

const HEADER_ROWS = [['2026'], ['Task list', 'Priority', 'Status', 'Push To', 'Reason', 'Timeline', 'Remark'], ['QA Tester']];

afterEach(() => vi.unstubAllGlobals());

describe('monthly tasklist helpers', () => {
  it('builds tab and date labels', () => {
    expect(monthlyTabName('2026-11')).toBe('Nov - Tasklist(2026)');
    expect(dateHeaderLabel('2026-11-02')).toBe('Monday, 02 November 2026');
  });
});

describe('syncTasksToMonthlySheet day offs', () => {
  it('adds a green Holiday header with Ubuntu 12 black text', async () => {
    const calls = fakeGoogle(HEADER_ROWS);
    await syncTasksToMonthlySheet([], '2026-11', [dayOff({ date: '2026-11-04' })], config);

    const write = calls.find((c) => c.method === 'PUT');
    expect(write?.body.values).toEqual([['Wednesday, 04 November 2026 - Holiday']]);
    const style = calls.find((c) => c.body?.requests?.[0]?.repeatCell)?.body.requests[0].repeatCell;
    expect(style.range).toMatchObject({ sheetId: 7, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 7 });
    expect(style.cell.userEnteredFormat.backgroundColor.green).toBeGreaterThan(0.7);
    expect(style.cell.userEnteredFormat.textFormat).toMatchObject({ fontFamily: 'Ubuntu', fontSize: 12, foregroundColor: { red: 0, green: 0, blue: 0 } });
  });

  it('relabels an existing header and colours leave yellow', async () => {
    const calls = fakeGoogle([...HEADER_ROWS, ['Wednesday, 04 November 2026']]);
    await syncTasksToMonthlySheet([], '2026-11', [dayOff({ kind: 'leave', detail: 'morning' })], config);

    const write = calls.find((c) => c.method === 'PUT');
    expect(write?.url).toContain('A4:G4');
    expect(write?.body.values).toEqual([['Wednesday, 04 November 2026 - Leave (morning)']]);
    const style = calls.find((c) => c.body?.requests?.[0]?.repeatCell)?.body.requests[0].repeatCell;
    expect(style.cell.userEnteredFormat.backgroundColor).toMatchObject({ red: 1, blue: 0 });
  });

  it('styles a plain header with only the font', async () => {
    const calls = fakeGoogle(HEADER_ROWS);
    await syncTasksToMonthlySheet([makeTask({ title: 'Zoom QR', scheduledDate: '2026-11-04' })], '2026-11', [], config);
    const style = calls.find((c) => c.body?.requests?.[0]?.repeatCell)?.body.requests[0].repeatCell;
    expect(style.cell.userEnteredFormat.backgroundColor).toBeUndefined();
    expect(style.cell.userEnteredFormat.textFormat).toMatchObject({ fontFamily: 'Ubuntu', fontSize: 12 });
  });
});
