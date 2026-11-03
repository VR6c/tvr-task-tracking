import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api/errors';
import { assertCronSecret } from '@/lib/auth/secrets';
import { runJob } from '@/lib/telegram/jobs';

export const dynamic = 'force-dynamic';

/** 08:30 Asia/Phnom_Penh = 01:30 UTC (vercel.json). */
export async function GET(req: Request): Promise<Response> {
  try {
    assertCronSecret(req);
    return NextResponse.json(await runJob('daily-digest'));
  } catch (error) {
    return toErrorResponse(error);
  }
}
