import {
  CATEGORY_LABELS,
  ENVIRONMENT_LABELS,
  ENVIRONMENTS,
  STATUS_LABELS,
  TASK_CATEGORIES,
  TASK_STATUSES,
} from '@/lib/constants';

const toOptions = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }));

export const CATEGORY_OPTIONS = toOptions(TASK_CATEGORIES, CATEGORY_LABELS);
export const ENVIRONMENT_OPTIONS = toOptions(ENVIRONMENTS, ENVIRONMENT_LABELS);
export const STATUS_OPTIONS = toOptions(TASK_STATUSES, STATUS_LABELS);
