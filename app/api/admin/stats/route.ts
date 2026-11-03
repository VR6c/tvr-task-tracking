import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/with-auth';
import { getAdminStats } from '@/lib/db/admin';
import { getDb } from '@/lib/db/client';
import { monthYearOf, todayInTimezone } from '@/lib/week-utils';

export const dynamic = 'force-dynamic';

/** Admin routes: the admin is the single allowed Telegram user (ALLOWED_TELEGRAM_USER_ID). */
export const GET = withAuth(async (_req, { userId }) => {
  const today = todayInTimezone();
  return NextResponse.json(await getAdminStats(getDb(), userId, today, monthYearOf(today)));
});
