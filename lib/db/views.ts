import type { Database } from '@/lib/db/client';
import { getGcin, getNarrative } from '@/lib/db/reviews';
import { listTasksByMonth, listWeekCandidates } from '@/lib/db/tasks';
import { auditDeadlines, computeKpis } from '@/lib/kpi/engine';
import { toTaskDTO } from '@/lib/tasks';
import { aggregateWeek } from '@/lib/weekly-aggregate';
import type { MonthlyResponse, WeeklyResponse } from '@/types/api';

export async function loadWeeklyView(
  db: Database,
  userId: number,
  weekStartDate: string,
  weekEndDate: string,
): Promise<WeeklyResponse> {
  const range = { start: weekStartDate, end: weekEndDate };
  const [rows, gcin] = await Promise.all([listWeekCandidates(db, userId, range), getGcin(db, userId, weekStartDate)]);
  return { weekStartDate, weekEndDate, sections: aggregateWeek(rows.map(toTaskDTO), range), gcin };
}

export async function loadMonthlyView(db: Database, userId: number, month: string): Promise<MonthlyResponse> {
  const [rows, narrative] = await Promise.all([listTasksByMonth(db, userId, month), getNarrative(db, userId, month)]);
  const tasks = rows.map(toTaskDTO);
  const { weeksInMonth, kpis } = computeKpis(tasks, month);
  return { month, weeksInMonth, kpis, audit: auditDeadlines(tasks, month), narrative };
}
