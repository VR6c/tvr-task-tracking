import { and, eq } from 'drizzle-orm';
import { monthlySummaries, weeklyReviews } from '@/db/schema';
import type { Database } from '@/lib/db/client';
import type { GcinInput, NarrativeInput } from '@/lib/validation';
import type { GcinDTO } from '@/types/api';

export const EMPTY_GCIN: GcinDTO = { good: '', challenge: '', improvement: '', nextAction: '' };

export async function getGcin(db: Database, userId: number, weekStartDate: string): Promise<GcinDTO> {
  const [row] = await db
    .select()
    .from(weeklyReviews)
    .where(and(eq(weeklyReviews.telegramUserId, userId), eq(weeklyReviews.weekStartDate, weekStartDate)));
  if (!row) return EMPTY_GCIN;
  return {
    good: row.good ?? '',
    challenge: row.challenge ?? '',
    improvement: row.improvement ?? '',
    nextAction: row.nextAction ?? '',
  };
}

/** Insert-or-update keyed on UNIQUE(telegram_user_id, week_start_date). */
export async function upsertGcin(db: Database, userId: number, input: GcinInput): Promise<GcinDTO> {
  const values = {
    good: input.good,
    challenge: input.challenge,
    improvement: input.improvement,
    nextAction: input.nextAction,
    weekEndDate: input.weekEndDate,
  };
  const [row] = await db
    .insert(weeklyReviews)
    .values({ telegramUserId: userId, weekStartDate: input.weekStartDate, ...values })
    .onConflictDoUpdate({
      target: [weeklyReviews.telegramUserId, weeklyReviews.weekStartDate],
      set: values,
    })
    .returning();
  if (!row) throw new Error('GCIN upsert returned no row');
  return {
    good: row.good ?? '',
    challenge: row.challenge ?? '',
    improvement: row.improvement ?? '',
    nextAction: row.nextAction ?? '',
  };
}

export interface NarrativeDTO {
  challenges: string;
  successStories: string;
}

export async function getNarrative(db: Database, userId: number, monthYear: string): Promise<NarrativeDTO> {
  const [row] = await db
    .select()
    .from(monthlySummaries)
    .where(and(eq(monthlySummaries.telegramUserId, userId), eq(monthlySummaries.monthYear, monthYear)));
  return { challenges: row?.challengesNarrative ?? '', successStories: row?.successStoriesNarrative ?? '' };
}

export async function upsertNarrative(db: Database, userId: number, input: NarrativeInput): Promise<NarrativeDTO> {
  const values = { challengesNarrative: input.challenges, successStoriesNarrative: input.successStories };
  const [row] = await db
    .insert(monthlySummaries)
    .values({ telegramUserId: userId, monthYear: input.month, ...values })
    .onConflictDoUpdate({
      target: [monthlySummaries.telegramUserId, monthlySummaries.monthYear],
      set: values,
    })
    .returning();
  if (!row) throw new Error('Narrative upsert returned no row');
  return { challenges: row.challengesNarrative ?? '', successStories: row.successStoriesNarrative ?? '' };
}
