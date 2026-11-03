import { NextResponse } from 'next/server';
import { queryParams } from '@/lib/api/request';
import { withAuth } from '@/lib/auth/with-auth';
import { getDb } from '@/lib/db/client';
import { loadMonthlyView } from '@/lib/db/views';
import { monthlyQuerySchema } from '@/lib/validation';
import type { MonthlyResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { userId }) => {
  const { month } = monthlyQuerySchema.parse(queryParams(req));
  return NextResponse.json<MonthlyResponse>(await loadMonthlyView(getDb(), userId, month));
});
