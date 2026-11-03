import { describe, expect, it } from 'vitest';
import { escapeMarkdown } from '@/lib/formatters/escape';
import { formatDailyStandup } from '@/lib/formatters/standup';
import { formatWeeklySlide } from '@/lib/formatters/weekly-slide';
import { aggregateWeek } from '@/lib/weekly-aggregate';
import { weekRange } from '@/lib/week-utils';
import { makeTask } from './factories';

describe('escapeMarkdown', () => {
  it('escapes Telegram Markdown control characters', () => {
    expect(escapeMarkdown('snake_case *bold* `code` [link]')).toBe('snake\\_case \\*bold\\* \\`code\\` \\[link]');
  });
});

describe('formatDailyStandup', () => {
  const tasks = [
    makeTask({ title: 'Regression voice msg', status: 'Done', category: 'quick_test', buildVersion: 'v2.5.17 build 668' }),
    makeTask({ title: '[Chat] Member Not Found', status: 'Success', category: 'production_bug', issueRemark: 'Profile lookup fails' }),
    makeTask({ title: 'Zoom QR scan', status: 'Feedback', category: 'milestone_feature' }),
  ];

  it('groups by Success/Completed, Feedback/Pending and Blockers & Issues', () => {
    expect(formatDailyStandup('2026-11-03', tasks)).toBe(
      [
        '*Daily Standup — Tue, Nov 3 2026*',
        '',
        '*Success / Completed* (2)',
        '• Regression voice msg — Quick Test · v2.5.17 build 668',
        '• \\[Chat] Member Not Found — Prod Bug',
        '',
        '*Feedback / Pending* (1)',
        '• Zoom QR scan — Feature',
        '',
        '*Blockers & Issues Logged* (1)',
        '• \\[Chat] Member Not Found — Prod Bug',
        '   ↳ Profile lookup fails',
      ].join('\n'),
    );
  });

  it('renders _None_ for empty sections and escapes user text', () => {
    const output = formatDailyStandup('2026-11-03', [makeTask({ title: 'fix_user*name', status: 'Done' })]);
    expect(output).toContain('fix\\_user\\*name');
    expect(output).toContain('*Feedback / Pending* (0)\n_None_');
    expect(output).toContain('*Blockers & Issues Logged* (0)\n_None_');
  });

  it('keeps multi-line remarks on a single list line', () => {
    const output = formatDailyStandup('2026-11-03', [makeTask({ status: 'Done', issueRemark: 'line one\nline two' })]);
    expect(output).toContain('↳ line one line two');
  });
});

describe('formatWeeklySlide', () => {
  const range = weekRange('2026-10-28');
  const sections = aggregateWeek(
    [
      makeTask({ title: 'Offline queue', status: 'Success', category: 'milestone_feature', environment: 'TestFlight', scheduledDate: '2026-10-28' }),
      makeTask({ title: 'Push tab bug', status: 'Done', issueRemark: 'Opens wrong tab', scheduledDate: '2026-10-29' }),
      makeTask({ title: 'Card review', status: 'Feedback', scheduledDate: '2026-10-30' }),
    ],
    range,
  );

  it('follows the CheckinMe Weekly Meeting structure', () => {
    const output = formatWeeklySlide('2026-10-26', sections, {
      good: 'Cleared the backlog',
      challenge: '',
      improvement: 'Pair on regression',
      nextAction: 'Ship checklist v2',
    });
    const headings = output.split('\n').filter((l) => /^\*(\d\.|GCIN|CheckinMe)/.test(l));
    expect(headings).toEqual([
      '*CheckinMe Weekly Meeting*',
      '*1. Last Week Achievement*',
      '*2. Plan in This Week*',
      '*3. Tracking Owner Confirm Task*',
      '*4. Issue Found Register*',
      '*GCIN Retrospective*',
    ]);
    expect(output).toContain('Week 44 · Oct 26 - Nov 1 2026');
    expect(output).toContain('*G — Good:* Cleared the backlog');
    expect(output).toContain('*C — Challenge:* _—_');
    expect(output).toContain('*N — Next Action:* Ship checklist v2');
    expect(output).toContain('• Offline queue — Feature');
    expect(output).toContain('↳ Opens wrong tab');
  });
});
