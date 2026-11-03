import { NextResponse } from 'next/server';
import { queryParams } from '@/lib/api/request';
import { withAuth } from '@/lib/auth/with-auth';
import { searchTasks } from '@/lib/db/admin';
import { getDb } from '@/lib/db/client';
import { toTaskDTO } from '@/lib/tasks';
import { adminTasksQuerySchema } from '@/lib/validation';
import type { AdminTasksResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export const GET = withAuth(async (req, { userId }) => {
  const { q } = adminTasksQuerySchema.parse(queryParams(req));
  const rows = await searchTasks(getDb(), userId, q, PAGE_SIZE);
  return NextResponse.json<AdminTasksResponse>({ tasks: rows.map(toTaskDTO) });
});
