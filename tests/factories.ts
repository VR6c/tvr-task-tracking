import type { TaskDTO } from '@/types/api';

let counter = 0;

export function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  counter += 1;
  const scheduledDate = overrides.scheduledDate ?? '2026-11-03';
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
    title: `Task ${counter}`,
    category: 'quick_test',
    environment: 'Development',
    status: 'Feedback',
    buildVersion: null,
    scheduledDate,
    completedAt: null,
    isOverDeadline: false,
    issueRemark: null,
    monthYear: scheduledDate.slice(0, 7),
    createdAt: `2026-11-03T0${counter % 10}:00:00.000Z`,
    ...overrides,
  };
}
