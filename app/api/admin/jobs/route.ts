import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/with-auth';
import { JOB_KEYS, JOB_LABELS } from '@/lib/telegram/jobs';
import type { AdminJobsResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () =>
  NextResponse.json<AdminJobsResponse>({ jobs: JOB_KEYS.map((key) => ({ key, ...JOB_LABELS[key] })) }),
);
