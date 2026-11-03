import type { NewTaskRow, TaskRow } from '@/db/schema';
import { isCompletedStatus, type TaskStatus } from '@/lib/constants';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validation';
import { monthYearOf, todayInTimezone } from '@/lib/week-utils';
import type { TaskDTO } from '@/types/api';

/**
 * completed_at rules (PATCH /api/tasks/[id]):
 * - becomes Done/Success from Feedback  -> stamp `now`
 * - moves between Done and Success      -> keep the original completion time
 * - reverts to Feedback                 -> clear
 */
export function computeCompletedAt(
  previous: { status: TaskStatus; completedAt: Date | null },
  nextStatus: TaskStatus,
  now: Date,
): Date | null {
  if (!isCompletedStatus(nextStatus)) return null;
  if (isCompletedStatus(previous.status) && previous.completedAt) return previous.completedAt;
  return now;
}

export function buildNewTask(
  input: CreateTaskInput,
  telegramUserId: number,
  now: Date = new Date(),
): NewTaskRow {
  const scheduledDate = input.scheduledDate ?? todayInTimezone(now);
  return {
    telegramUserId,
    title: input.title,
    category: input.category,
    environment: input.environment,
    status: input.status,
    buildVersion: input.buildVersion,
    scheduledDate,
    monthYear: monthYearOf(scheduledDate),
    isOverDeadline: input.isOverDeadline,
    issueRemark: input.issueRemark,
    completedAt: isCompletedStatus(input.status) ? now : null,
  };
}

export type TaskPatch = Partial<
  Pick<
    TaskRow,
    'status' | 'completedAt' | 'isOverDeadline' | 'issueRemark' | 'title' | 'category' | 'environment' | 'buildVersion'
  >
>;

export function buildTaskPatch(existing: TaskRow, input: UpdateTaskInput, now: Date = new Date()): TaskPatch {
  const patch: TaskPatch = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.category !== undefined) patch.category = input.category;
  if (input.environment !== undefined) patch.environment = input.environment;
  if (input.buildVersion !== undefined) patch.buildVersion = input.buildVersion;
  if (input.issueRemark !== undefined) patch.issueRemark = input.issueRemark;
  if (input.isOverDeadline !== undefined) patch.isOverDeadline = input.isOverDeadline;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completedAt = computeCompletedAt(existing, input.status, now);
  }
  return patch;
}

export function toTaskDTO(row: TaskRow): TaskDTO {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    environment: row.environment,
    status: row.status,
    buildVersion: row.buildVersion,
    scheduledDate: row.scheduledDate,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    isOverDeadline: row.isOverDeadline,
    issueRemark: row.issueRemark,
    monthYear: row.monthYear,
    createdAt: row.createdAt.toISOString(),
  };
}

export function countCompleted(tasks: readonly Pick<TaskDTO, 'status'>[]): number {
  return tasks.filter((t) => isCompletedStatus(t.status)).length;
}
