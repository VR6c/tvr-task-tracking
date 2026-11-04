import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { dayOffs, type DayOffRow } from '@/db/schema';
import type { Database } from '@/lib/db/client';
import { monthRange } from '@/lib/week-utils';

export interface DayOffInput {
  date: string;
  kind: DayOffRow['kind'];
  detail: string | null;
}

/** One entry per user and date: a later message for the same date replaces the earlier one. */
export async function upsertDayOff(db: Database, userId: number, input: DayOffInput): Promise<DayOffRow> {
  const [row] = await db
    .insert(dayOffs)
    .values({ telegramUserId: userId, ...input })
    .onConflictDoUpdate({
      target: [dayOffs.telegramUserId, dayOffs.date],
      set: { kind: input.kind, detail: input.detail },
    })
    .returning();
  if (!row) throw new Error('Day-off upsert returned no row');
  return row;
}

export async function listDayOffsByMonth(db: Database, userId: number, monthYear: string): Promise<DayOffRow[]> {
  const { start, end } = monthRange(monthYear);
  return db
    .select()
    .from(dayOffs)
    .where(and(eq(dayOffs.telegramUserId, userId), gte(dayOffs.date, start), lte(dayOffs.date, end)))
    .orderBy(asc(dayOffs.date));
}
