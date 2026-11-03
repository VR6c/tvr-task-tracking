import type { Environment, TaskCategory, TaskStatus } from '@/lib/constants';
import type { KpiStatus } from '@/lib/kpi/config';

/** JSON shapes shared by API routes and the client. Dates are ISO strings on the wire. */
export interface TaskDTO {
  id: string;
  title: string;
  category: TaskCategory;
  environment: Environment;
  status: TaskStatus;
  buildVersion: string | null;
  scheduledDate: string;
  completedAt: string | null;
  isOverDeadline: boolean;
  issueRemark: string | null;
  monthYear: string;
  createdAt: string;
}

export interface GcinDTO {
  good: string;
  challenge: string;
  improvement: string;
  nextAction: string;
}

export interface TasksResponse {
  date: string;
  tasks: TaskDTO[];
}

export interface WeeklySections {
  achievements: TaskDTO[];
  plan: TaskDTO[];
  tracking: TaskDTO[];
  issues: TaskDTO[];
}

export interface WeeklyResponse {
  weekStartDate: string;
  weekEndDate: string;
  sections: WeeklySections;
  gcin: GcinDTO;
}

export interface KpiItemResult {
  key: string;
  label: string;
  category: TaskCategory;
  period: 'month' | 'week';
  actual: number;
  good: number;
  excellence: number;
  status: KpiStatus;
}

export interface DeadlineAudit {
  onTime: TaskDTO[];
  overDeadline: TaskDTO[];
}

export interface MonthlyResponse {
  month: string;
  weeksInMonth: number;
  kpis: KpiItemResult[];
  audit: DeadlineAudit;
  narrative: { challenges: string; successStories: string };
}

export interface ApiErrorBody {
  error: string;
  code: string;
}
