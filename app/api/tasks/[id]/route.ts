import { NextResponse } from 'next/server';
import { ApiError, readJson } from '@/lib/api/errors';
import { withAuth } from '@/lib/auth/with-auth';
import { getDb } from '@/lib/db/client';
import { deleteTask, updateTask } from '@/lib/db/tasks';
import { toTaskDTO } from '@/lib/tasks';
import { updateTaskSchema, uuidSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) throw ApiError.notFound('Task not found');
  const input = updateTaskSchema.parse(await readJson(req));
  const row = await updateTask(getDb(), userId, id.data, input);
  if (!row) throw ApiError.notFound('Task not found');
  return NextResponse.json({ task: toTaskDTO(row) });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success || !(await deleteTask(getDb(), userId, id.data))) throw ApiError.notFound('Task not found');
  return new Response(null, { status: 204 });
});
