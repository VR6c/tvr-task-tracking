import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Enum values are the single source of truth; lib/constants re-exports them.
export const TASK_CATEGORIES = [
  'quick_test',
  'milestone_feature',
  'production_bug',
  'idea_propose',
  'research_doc',
] as const;
export const TASK_STATUSES = ['Feedback', 'Done', 'Success'] as const;
export const ENVIRONMENTS = ['Development', 'TestFlight', 'Production'] as const;

export const taskCategoryEnum = pgEnum('task_category', TASK_CATEGORIES);
export const taskStatusEnum = pgEnum('task_status', TASK_STATUSES);
export const environmentTypeEnum = pgEnum('environment_type', ENVIRONMENTS);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    telegramUserId: bigint('telegram_user_id', { mode: 'number' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    category: taskCategoryEnum('category').notNull(),
    environment: environmentTypeEnum('environment').default('Development').notNull(),
    status: taskStatusEnum('status').default('Feedback').notNull(),
    buildVersion: varchar('build_version', { length: 100 }),
    scheduledDate: date('scheduled_date', { mode: 'string' }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    isOverDeadline: boolean('is_over_deadline').default(false).notNull(),
    issueRemark: text('issue_remark'),
    // Always derived from scheduled_date ('YYYY-MM'); the CHECK keeps it honest (NFR-03).
    monthYear: varchar('month_year', { length: 7 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [
    check('tasks_month_year_matches_date', sql`${t.monthYear} = to_char(${t.scheduledDate}, 'YYYY-MM')`),
    index('tasks_user_date_idx').on(t.telegramUserId, t.scheduledDate),
    index('tasks_user_month_idx').on(t.telegramUserId, t.monthYear),
  ],
);

export const weeklyReviews = pgTable(
  'weekly_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    telegramUserId: bigint('telegram_user_id', { mode: 'number' }).notNull(),
    weekStartDate: date('week_start_date', { mode: 'string' }).notNull(),
    weekEndDate: date('week_end_date', { mode: 'string' }).notNull(),
    good: text('good'),
    challenge: text('challenge'),
    improvement: text('improvement'),
    nextAction: text('next_action'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [unique('weekly_reviews_user_week_unique').on(t.telegramUserId, t.weekStartDate)],
);

export const monthlySummaries = pgTable(
  'monthly_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    telegramUserId: bigint('telegram_user_id', { mode: 'number' }).notNull(),
    monthYear: varchar('month_year', { length: 7 }).notNull(),
    challengesNarrative: text('challenges_narrative'),
    successStoriesNarrative: text('success_stories_narrative'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [unique('monthly_summaries_user_month_unique').on(t.telegramUserId, t.monthYear)],
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type WeeklyReviewRow = typeof weeklyReviews.$inferSelect;
export type MonthlySummaryRow = typeof monthlySummaries.$inferSelect;
