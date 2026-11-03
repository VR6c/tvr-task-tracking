import { z } from 'zod';
import {
  BUILD_VERSION_MAX_LENGTH,
  ENVIRONMENTS,
  NARRATIVE_MAX_LENGTH,
  TASK_CATEGORIES,
  TASK_STATUSES,
  TITLE_MAX_LENGTH,
} from '@/lib/constants';
import { isValidIsoDate, isValidMonthYear, isWeekRange } from '@/lib/week-utils';

export const isoDateSchema = z.string().refine(isValidIsoDate, 'Expected a valid date in YYYY-MM-DD format');
export const monthYearSchema = z.string().refine(isValidMonthYear, 'Expected a month in YYYY-MM format');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const titleSchema = z.string().trim().min(1, 'Title is required').max(TITLE_MAX_LENGTH);

export const createTaskSchema = z.object({
  title: titleSchema,
  category: z.enum(TASK_CATEGORIES),
  environment: z.enum(ENVIRONMENTS).default('Development'),
  status: z.enum(TASK_STATUSES).default('Feedback'),
  buildVersion: optionalText(BUILD_VERSION_MAX_LENGTH),
  issueRemark: optionalText(NARRATIVE_MAX_LENGTH),
  /** Defaults to today (Asia/Phnom_Penh) when omitted. */
  scheduledDate: isoDateSchema.optional(),
  isOverDeadline: z.boolean().default(false),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    status: z.enum(TASK_STATUSES),
    isOverDeadline: z.boolean(),
    issueRemark: optionalText(NARRATIVE_MAX_LENGTH),
    title: titleSchema,
    category: z.enum(TASK_CATEGORIES),
    environment: z.enum(ENVIRONMENTS),
    buildVersion: optionalText(BUILD_VERSION_MAX_LENGTH),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const uuidSchema = z.string().uuid();

export const tasksQuerySchema = z.object({ date: isoDateSchema });

export const adminTasksQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
});

export const weeklyQuerySchema = z
  .object({ startDate: isoDateSchema, endDate: isoDateSchema })
  .refine((v) => isWeekRange(v.startDate, v.endDate), {
    message: 'startDate must be a Monday and endDate the following Sunday',
    path: ['startDate'],
  });

const gcinText = z.string().max(NARRATIVE_MAX_LENGTH).default('');

export const gcinSchema = z
  .object({
    weekStartDate: isoDateSchema,
    weekEndDate: isoDateSchema,
    good: gcinText,
    challenge: gcinText,
    improvement: gcinText,
    nextAction: gcinText,
  })
  .refine((v) => isWeekRange(v.weekStartDate, v.weekEndDate), {
    message: 'weekStartDate must be a Monday and weekEndDate the following Sunday',
    path: ['weekStartDate'],
  });
export type GcinInput = z.infer<typeof gcinSchema>;

export const monthlyQuerySchema = z.object({ month: monthYearSchema });

export const narrativeSchema = z.object({
  month: monthYearSchema,
  challenges: z.string().max(NARRATIVE_MAX_LENGTH).default(''),
  successStories: z.string().max(NARRATIVE_MAX_LENGTH).default(''),
});
export type NarrativeInput = z.infer<typeof narrativeSchema>;
