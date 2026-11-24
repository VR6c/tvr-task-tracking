import { ApiError } from '@/lib/api/errors';
import { getDb } from '@/lib/db/client';
import { deleteTask } from '@/lib/db/tasks';
import { uuidSchema } from '@/lib/validation';

/** A malformed id can't match any task, so it is reported the same way as a missing one. */
export function parseTaskId(raw: string): string {
  const id = uuidSchema.safeParse(raw);
  if (!id.success) throw ApiError.notFound('Task not found');
  return id.data;
}

/** 204 once the user's task is deleted; 404 when it is missing or belongs to someone else. */
export async function deleteTaskResponse(userId: number, rawId: string): Promise<Response> {
  if (!(await deleteTask(getDb(), userId, parseTaskId(rawId)))) throw ApiError.notFound('Task not found');
  return new Response(null, { status: 204 });
}
