import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api/errors';
import { assertCronSecret } from '@/lib/auth/secrets';
import { runJob } from '@/lib/telegram/jobs';

export const dynamic = 'force-dynamic';

/** 17:15 Asia/Phnom_Penh = 10:15 UTC (vercel.json). Upserts this month's tasks into Google Sheets. */
export async function GET(req: Request): Promise<Response> {
  try {
    assertCronSecret(req);
    return NextResponse.json(await runJob('sheets-sync'));
  } catch (error) {
    return toErrorResponse(error);
  }
}
