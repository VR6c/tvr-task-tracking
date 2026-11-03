import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api/errors';
import { assertCronSecret } from '@/lib/auth/secrets';
import { runJob } from '@/lib/telegram/jobs';

export const dynamic = 'force-dynamic';

/** Saturday 10:00 Asia/Phnom_Penh = 03:00 UTC Saturday (vercel.json). */
export async function GET(req: Request): Promise<Response> {
  try {
    assertCronSecret(req);
    return NextResponse.json(await runJob('weekly-reminder'));
  } catch (error) {
    return toErrorResponse(error);
  }
}
