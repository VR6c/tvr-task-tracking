import { and, count, desc, eq, ilike, max, sql } from 'drizzle-orm';
import { monthlySummaries, tasks, weeklyReviews, type TaskRow } from '@/db/schema';
import { TASK_CATEGORIES, TASK_STATUSES } from '@/lib/constants';
import type { Database } from '@/lib/db/client';
import type { AdminStatsResponse } from '@/types/api';

export async function getAdminStats(
  db: Database,
  userId: number,
  today: string,
  monthYear: string,
): Promise<AdminStatsResponse> {
  const mine = eq(tasks.telegramUserId, userId);
  const [totals, statusRows, categoryRows, reviews, summaries] = await Promise.all([
    db
      .select({
        tasks: count(),
        thisMonth: sql<number>`count(*) filter (where ${tasks.monthYear} = ${monthYear})`.mapWith(Number),
        overDeadline: sql<number>`count(*) filter (where ${tasks.isOverDeadline})`.mapWith(Number),
        openCarryOvers: sql<number>`count(*) filter (where ${tasks.status} in ('Plan', 'Feedback') and ${tasks.scheduledDate} < ${today})`.mapWith(Number),
        lastTaskAt: max(tasks.createdAt),
      })
      .from(tasks)
      .where(mine),
    db.select({ key: tasks.status, n: count() }).from(tasks).where(mine).groupBy(tasks.status),
    db
      .select({ key: tasks.category, n: count() })
      .from(tasks)
      .where(and(mine, eq(tasks.monthYear, monthYear)))
      .groupBy(tasks.category),
    db.select({ n: count() }).from(weeklyReviews).where(eq(weeklyReviews.telegramUserId, userId)),
    db.select({ n: count() }).from(monthlySummaries).where(eq(monthlySummaries.telegramUserId, userId)),
  ]);

  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as AdminStatsResponse['byStatus'];
  for (const row of statusRows) byStatus[row.key] = row.n;
  const byCategory = Object.fromEntries(TASK_CATEGORIES.map((c) => [c, 0])) as AdminStatsResponse['byCategory'];
  for (const row of categoryRows) byCategory[row.key] = row.n;

  const total = totals[0];
  return {
    today,
    month: monthYear,
    totals: {
      tasks: total?.tasks ?? 0,
      thisMonth: total?.thisMonth ?? 0,
      open: byStatus.Plan + byStatus.Feedback,
      openCarryOvers: total?.openCarryOvers ?? 0,
      overDeadline: total?.overDeadline ?? 0,
      weeklyReviews: reviews[0]?.n ?? 0,
      monthlySummaries: summaries[0]?.n ?? 0,
    },
    lastTaskAt: total?.lastTaskAt ? total.lastTaskAt.toISOString() : null,
    byStatus,
    byCategory,
  };
}

/** Escapes LIKE wildcards so a search for "100%" matches literally. */
const likePattern = (query: string): string => `%${query.replace(/[\\%_]/g, '\\$&')}%`;

/** Newest tasks first, optionally filtered by a title substring. */
export async function searchTasks(db: Database, userId: number, query: string, limit: number): Promise<TaskRow[]> {
  const mine = eq(tasks.telegramUserId, userId);
  return db
    .select()
    .from(tasks)
    .where(query ? and(mine, ilike(tasks.title, likePattern(query))) : mine)
    .orderBy(desc(tasks.scheduledDate), desc(tasks.createdAt))
    .limit(limit);
}
