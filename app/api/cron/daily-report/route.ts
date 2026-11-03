import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api/errors';
import { assertCronSecret } from '@/lib/auth/secrets';
import { runJob } from '@/lib/telegram/jobs';

export const dynamic = 'force-dynamic';

/** 17:00 Asia/Phnom_Penh = 10:00 UTC (vercel.json). Sends "List all task today (date)". */
export async function GET(req: Request): Promise<Response> {
  try {
    assertCronSecret(req);
    return NextResponse.json(await runJob('daily-report'));
  } catch (error) {
    return toErrorResponse(error);
  }
}
