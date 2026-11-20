import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api/errors';
import { assertCronSecret } from '@/lib/auth/secrets';
import { runJob, type JobKey } from '@/lib/telegram/jobs';

/** GET handler for a Vercel cron route: checks the cron secret, then runs the job. */
export function cronHandler(job: JobKey) {
  return async (req: Request): Promise<Response> => {
    try {
      assertCronSecret(req);
      return NextResponse.json(await runJob(job));
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
