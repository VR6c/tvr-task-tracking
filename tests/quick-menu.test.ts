import { describe, expect, it } from 'vitest';
import { formatKpiSummary } from '@/lib/telegram/kpi-summary';
import { MENU, buildQuickMenu } from '@/lib/telegram/menu';
import { parseTaskMessage } from '@/lib/telegram/parser';
import type { MonthlyResponse } from '@/types/api';

describe('buildQuickMenu', () => {
  const keyboard = buildQuickMenu('https://app.example.com/daily');

  it('is a persistent, resized reply keyboard with a placeholder', () => {
    expect(keyboard).toMatchObject({ is_persistent: true, resize_keyboard: true });
    expect(keyboard.input_field_placeholder).toContain('Log a task');
  });

  it('has a WebApp button on the first row and the three chat buttons below', () => {
    const [first, second] = keyboard.keyboard;
    expect(first).toEqual([{ text: MENU.openApp, web_app: { url: 'https://app.example.com/daily' } }]);
    expect(second).toEqual([{ text: MENU.today }, { text: MENU.week }, { text: MENU.kpi }]);
  });
});

describe('menu labels vs the task parser', () => {
  it('would otherwise be parsed as tasks, which is why the handlers are registered first', () => {
    expect(parseTaskMessage(MENU.today).ok).toBe(true);
    expect(parseTaskMessage(MENU.week).ok).toBe(true);
    expect(parseTaskMessage(MENU.kpi).ok).toBe(true);
  });
});

describe('formatKpiSummary', () => {
  const view: MonthlyResponse = {
    month: '2026-10',
    weeksInMonth: 4,
    kpis: [
      { key: 'quick_test', label: 'Quick Test on TestFlight', category: 'quick_test', period: 'month', actual: 4, good: 3, excellence: 4, status: 'Excellence' },
      { key: 'production_error', label: 'Finding Production Error', category: 'production_bug', period: 'week', actual: 2, good: 4, excellence: 12, status: 'Under' },
    ],
    audit: { onTime: [], overDeadline: [] },
    narrative: { challenges: '', successStories: '' },
  };

  it('lists each KPI with actual, targets and status plus the audit counts', () => {
    expect(formatKpiSummary(view)).toBe(
      [
        '*Monthly KPIs — October 2026*',
        '',
        '*Quick Test on TestFlight*\n   4 actual · Good 3 · Excellence 4 — *Excellence Achieved*',
        '*Finding Production Error*\n   2 actual · Good 4 · Excellence 12 — *Under*',
        '',
        'Deadline audit: 0 on time · 0 over deadline',
      ].join('\n'),
    );
  });
});
