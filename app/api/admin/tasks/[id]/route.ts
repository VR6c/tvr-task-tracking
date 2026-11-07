import { ApiError } from '@/lib/api/errors';
import { withAuth } from '@/lib/auth/with-auth';
import { getDb } from '@/lib/db/client';
import { deleteTask } from '@/lib/db/tasks';
import { uuidSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const DELETE = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success || !(await deleteTask(getDb(), userId, id.data))) throw ApiError.notFound('Task not found');
  return new Response(null, { status: 204 });
});
