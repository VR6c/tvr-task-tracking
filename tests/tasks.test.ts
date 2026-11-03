import { describe, expect, it } from 'vitest';
import type { TaskRow } from '@/db/schema';
import { buildNewTask, buildTaskPatch, computeCompletedAt } from '@/lib/tasks';
import { createTaskSchema, gcinSchema, updateTaskSchema, weeklyQuerySchema } from '@/lib/validation';

const now = new Date('2026-11-03T03:00:00.000Z');
const earlier = new Date('2026-11-02T03:00:00.000Z');

describe('computeCompletedAt', () => {
  it('stamps when a task becomes Done or Success', () => {
    expect(computeCompletedAt({ status: 'Feedback', completedAt: null }, 'Done', now)).toEqual(now);
    expect(computeCompletedAt({ status: 'Feedback', completedAt: null }, 'Success', now)).toEqual(now);
  });
  it('keeps the original time when moving between Done and Success', () => {
    expect(computeCompletedAt({ status: 'Done', completedAt: earlier }, 'Success', now)).toEqual(earlier);
  });
  it('clears when reverted to Feedback', () => {
    expect(computeCompletedAt({ status: 'Done', completedAt: earlier }, 'Feedback', now)).toBeNull();
  });
});

describe('task construction', () => {
  it('derives month_year from scheduled_date and defaults the date to today in Phnom Penh', () => {
    const input = createTaskSchema.parse({ title: 'Smoke', category: 'quick_test', scheduledDate: '2026-10-31' });
    expect(buildNewTask(input, 1, now).monthYear).toBe('2026-10');

    const noDate = createTaskSchema.parse({ title: 'Smoke', category: 'quick_test' });
    const late = new Date('2026-10-31T18:00:00.000Z'); // 01:00 on 1 Nov in Phnom Penh
    const row = buildNewTask(noDate, 1, late);
    expect(row.scheduledDate).toBe('2026-11-01');
    expect(row.monthYear).toBe('2026-11');
  });

  it('applies defaults and stamps completed_at for tasks created as Done', () => {
    const input = createTaskSchema.parse({ title: ' Hi ', category: 'idea_propose', status: 'Done' });
    const row = buildNewTask(input, 1, now);
    expect(row).toMatchObject({ title: 'Hi', environment: 'Development', buildVersion: null, completedAt: now });
  });

  it('builds a patch that only touches provided fields', () => {
    const existing = { status: 'Feedback', completedAt: null } as TaskRow;
    expect(buildTaskPatch(existing, { isOverDeadline: true }, now)).toEqual({ isOverDeadline: true });
    expect(buildTaskPatch(existing, { status: 'Done' }, now)).toEqual({ status: 'Done', completedAt: now });
  });
});

describe('validation', () => {
  it('rejects blank titles, unknown categories and empty patches', () => {
    expect(createTaskSchema.safeParse({ title: '  ', category: 'quick_test' }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: 'x', category: 'nope' }).success).toBe(false);
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
    expect(updateTaskSchema.safeParse({ status: 'Blocked' }).success).toBe(false);
  });

  it('requires Monday-Sunday windows for weekly endpoints', () => {
    expect(weeklyQuerySchema.safeParse({ startDate: '2026-10-26', endDate: '2026-11-01' }).success).toBe(true);
    expect(weeklyQuerySchema.safeParse({ startDate: '2026-10-27', endDate: '2026-11-02' }).success).toBe(false);
    expect(gcinSchema.safeParse({ weekStartDate: '2026-10-26', weekEndDate: '2026-10-31' }).success).toBe(false);
  });
});
