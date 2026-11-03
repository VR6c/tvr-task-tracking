import { NextResponse } from 'next/server';
import { queryParams } from '@/lib/api/request';
import { withAuth } from '@/lib/auth/with-auth';
import { getDb } from '@/lib/db/client';
import { loadWeeklyView } from '@/lib/db/views';
import { weeklyQuerySchema } from '@/lib/validation';
import type { WeeklyResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { userId }) => {
  const { startDate, endDate } = weeklyQuerySchema.parse(queryParams(req));
  return NextResponse.json<WeeklyResponse>(await loadWeeklyView(getDb(), userId, startDate, endDate));
});
