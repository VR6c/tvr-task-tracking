import { NextResponse } from 'next/server';
import { ApiError, readJson } from '@/lib/api/errors';
import { deleteTaskResponse, parseTaskId } from '@/lib/api/task-routes';
import { withAuth } from '@/lib/auth/with-auth';
import { getDb } from '@/lib/db/client';
import { updateTask } from '@/lib/db/tasks';
import { toTaskDTO } from '@/lib/tasks';
import { updateTaskSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const id = parseTaskId(params.id);
  const input = updateTaskSchema.parse(await readJson(req));
  const row = await updateTask(getDb(), userId, id, input);
  if (!row) throw ApiError.notFound('Task not found');
  return NextResponse.json({ task: toTaskDTO(row) });
});

export const DELETE = withAuth<{ id: string }>((_req, { userId, params }) => deleteTaskResponse(userId, params.id));
