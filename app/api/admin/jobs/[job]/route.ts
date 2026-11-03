import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/errors';
import { withAuth } from '@/lib/auth/with-auth';
import { isJobKey, runJob } from '@/lib/telegram/jobs';
import type { AdminJobResult } from '@/types/api';

export const dynamic = 'force-dynamic';

/** Sends the scheduled message immediately, exactly as the cron would. */
export const POST = withAuth<{ job: string }>(async (_req, { params }) => {
  if (!isJobKey(params.job)) throw ApiError.notFound('Unknown job');
  try {
    return NextResponse.json<AdminJobResult>({ key: params.job, result: await runJob(params.job) });
  } catch (error) {
    console.error(`Admin job ${params.job} failed`, error);
    throw ApiError.upstream('The job failed. Check the server logs.');
  }
});
