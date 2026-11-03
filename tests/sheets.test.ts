import { generateKeyPairSync } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHEET_HEADER, syncTasksToSheet, taskToRow } from '@/lib/sheets/daily-tasks';
import type { SheetsConfig } from '@/lib/sheets/client';
import { makeTask } from './factories';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const config: SheetsConfig = { email: 'sync@proj.iam.gserviceaccount.com', privateKey, spreadsheetId: 'sheet-1', tab: "Daily Tasks" };

interface Call {
  method: string;
  url: string;
  body: unknown;
}

/** Fake Google: token endpoint + a sheet whose column J holds `existingIds` (header first). */
function fakeGoogle(opts: { tabs?: string[]; idColumn?: string[] }) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { method?: string; body?: unknown } = {}) => {
      const body = typeof init.body === 'string' && !url.includes('oauth2') ? JSON.parse(init.body) : init.body;
      calls.push({ method: init.method ?? 'GET', url: decodeURIComponent(url), body });
      const reply = (json: unknown) => new Response(JSON.stringify(json), { status: 200 });
      if (url.includes('oauth2')) return reply({ access_token: 'tok', expires_in: 3600 });
      if (url.includes('fields=sheets')) return reply({ sheets: (opts.tabs ?? ['Daily Tasks']).map((title) => ({ properties: { title } })) });
      if (url.includes('majorDimension=COLUMNS')) return reply(opts.idColumn ? { values: [opts.idColumn] } : {});
      return reply({});
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('taskToRow', () => {
  it('maps a task to the sheet columns in header order', () => {
    const task = makeTask({ title: 'Zoom QR', category: 'milestone_feature', environment: 'TestFlight', status: 'Done', buildVersion: '2.5.17', isOverDeadline: true, issueRemark: 'Crash', completedAt: '2026-11-03T05:00:00.000Z' });
    const row = taskToRow(task);
    expect(row).toHaveLength(SHEET_HEADER.length);
    expect(row).toEqual([task.scheduledDate, 'Zoom QR', 'Feature', 'TestFlight', 'Done', '2.5.17', 'Yes', 'Crash', '2026-11-03T05:00:00.000Z', task.id]);
  });
});

describe('syncTasksToSheet', () => {
  it('writes the header and appends new tasks to an empty tab', async () => {
    const calls = fakeGoogle({});
    const task = makeTask({ title: '=SUM(A1)' });
    expect(await syncTasksToSheet([task], config)).toEqual({ updated: 0, appended: 1 });

    const header = calls.find((c) => c.method === 'PUT');
    expect(header?.url).toContain("'Daily Tasks'!A1?valueInputOption=RAW");
    expect(header?.body).toEqual({ values: [[...SHEET_HEADER]] });
    const append = calls.find((c) => c.url.includes(':append'));
    expect(append?.url).toContain('valueInputOption=RAW');
    expect((append?.body as { values: string[][] }).values[0]?.[1]).toBe('=SUM(A1)');
    expect(calls.some((c) => c.url.includes('batchUpdate'))).toBe(false);
  });

  it('rewrites an existing row in place and appends only the new task', async () => {
    const existing = makeTask({ title: 'Task A', status: 'Done' });
    const fresh = makeTask({ title: 'Task B' });
    const calls = fakeGoogle({ idColumn: ['Task ID', 'other-id', existing.id] });

    expect(await syncTasksToSheet([existing, fresh], config)).toEqual({ updated: 1, appended: 1 });
    expect(calls.some((c) => c.method === 'PUT')).toBe(false); // header already present
    const update = calls.find((c) => c.url.endsWith('/values:batchUpdate'));
    expect(update?.body).toMatchObject({ valueInputOption: 'RAW', data: [{ range: "'Daily Tasks'!A3:J3" }] });
    const appended = calls.find((c) => c.url.includes(':append'));
    expect((appended?.body as { values: string[][] }).values).toEqual([taskToRow(fresh)]);
  });

  it('creates the tab when it does not exist and makes no value calls for an empty list', async () => {
    const calls = fakeGoogle({ tabs: ['Sheet1'], idColumn: ['Task ID'] });
    expect(await syncTasksToSheet([], config)).toEqual({ updated: 0, appended: 0 });
    const add = calls.find((c) => c.url.endsWith(':batchUpdate'));
    expect(JSON.stringify(add?.body)).toContain('"title":"Daily Tasks"');
    expect(calls.some((c) => c.url.includes(':append') || c.url.endsWith('/values:batchUpdate'))).toBe(false);
  });
});
