import { deleteTaskResponse } from '@/lib/api/task-routes';
import { withAuth } from '@/lib/auth/with-auth';

export const dynamic = 'force-dynamic';

export const DELETE = withAuth<{ id: string }>((_req, { userId, params }) => deleteTaskResponse(userId, params.id));
