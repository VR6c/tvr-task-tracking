import { describe, expect, it } from 'vitest';
import { chunkMessage, formatDailyTaskList } from '@/lib/telegram/daily-report';
import { makeTask } from './factories';

describe('formatDailyTaskList', () => {
  it('lists every task with its status under the requested heading', () => {
    const text = formatDailyTaskList('2026-11-03', [
      makeTask({ title: 'Regression voice msg', status: 'Done', buildVersion: 'v2.5.17 build 668' }),
      makeTask({ title: '[Chat] Member Not Found', status: 'Success', category: 'production_bug', issueRemark: 'Profile lookup fails' }),
      makeTask({ title: 'Zoom QR scan', status: 'Feedback', category: 'milestone_feature', isOverDeadline: true }),
    ]);
    expect(text).toBe(
      [
        '*List all task today (Tue, Nov 3 2026)*',
        '2/3 tasks done',
        '',
        '1. Regression voice msg',
        '   Quick Test · v2.5.17 build 668 — *Done*',
        '2. \\[Chat] Member Not Found',
        '   Prod Bug — *Success*',
        '   Issue: Profile lookup fails',
        '3. Zoom QR scan',
        '   Feature — *Feedback* (over deadline)',
      ].join('\n'),
    );
  });

  it('says so when nothing was logged', () => {
    expect(formatDailyTaskList('2026-11-03', [])).toBe(
      '*List all task today (Tue, Nov 3 2026)*\n\nNo tasks were logged today.',
    );
  });
});

describe('chunkMessage', () => {
  it('keeps short text in one message', () => {
    expect(chunkMessage('hello')).toEqual(['hello']);
  });

  it('splits long text on line boundaries within the limit', () => {
    const text = Array.from({ length: 50 }, (_, i) => `line ${i} ${'x'.repeat(40)}`).join('\n');
    const chunks = chunkMessage(text, 500);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 500)).toBe(true);
    expect(chunks.join('\n')).toBe(text);
  });
});
