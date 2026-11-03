import { NextResponse } from 'next/server';
import { readJson } from '@/lib/api/errors';
import { queryParams } from '@/lib/api/request';
import { withAuth } from '@/lib/auth/with-auth';
import { getDb } from '@/lib/db/client';
import { createTask, listTasksByDate } from '@/lib/db/tasks';
import { toTaskDTO } from '@/lib/tasks';
import { createTaskSchema, tasksQuerySchema } from '@/lib/validation';
import type { TasksResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { userId }) => {
  const { date } = tasksQuerySchema.parse(queryParams(req));
  const rows = await listTasksByDate(getDb(), userId, date);
  return NextResponse.json<TasksResponse>({ date, tasks: rows.map(toTaskDTO) });
});

export const POST = withAuth(async (req, { userId }) => {
  const input = createTaskSchema.parse(await readJson(req));
  const row = await createTask(getDb(), userId, input);
  return NextResponse.json({ task: toTaskDTO(row) }, { status: 201 });
});
