import { ENVIRONMENTS, TASK_CATEGORIES, TASK_STATUSES } from '@/db/schema';

export { ENVIRONMENTS, TASK_CATEGORIES, TASK_STATUSES };

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Environment = (typeof ENVIRONMENTS)[number];

/** All user-facing time logic runs in this zone; cron schedules are expressed in UTC (see README). */
export const APP_TIMEZONE = 'Asia/Phnom_Penh';

/** Name printed on the weekly slide export. */
export const REPORT_OWNER = 'Thary Vireak (QA)';

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  quick_test: 'Quick Test',
  milestone_feature: 'Feature',
  production_bug: 'Prod Bug',
  idea_propose: 'Idea',
  research_doc: 'Research',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  Feedback: 'Feedback',
  Done: 'Done',
  Success: 'Success',
};

/** Tap order used by the 1-tap status toggle (FR-DAY-02). */
export const STATUS_CYCLE: readonly TaskStatus[] = ['Feedback', 'Done', 'Success'];

export const COMPLETED_STATUSES: readonly TaskStatus[] = ['Done', 'Success'];

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  Development: 'Dev',
  TestFlight: 'TestFlight',
  Production: 'Prod',
};

export const TITLE_MAX_LENGTH = 255;
export const BUILD_VERSION_MAX_LENGTH = 100;
export const NARRATIVE_MAX_LENGTH = 10_000;

export function isCompletedStatus(status: TaskStatus): boolean {
  return status === 'Done' || status === 'Success';
}

export function nextStatus(status: TaskStatus): TaskStatus {
  const index = STATUS_CYCLE.indexOf(status);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length] ?? 'Feedback';
}
