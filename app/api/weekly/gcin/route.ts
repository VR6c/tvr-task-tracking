import { NextResponse } from 'next/server';
import { readJson } from '@/lib/api/errors';
import { withAuth } from '@/lib/auth/with-auth';
import { getDb } from '@/lib/db/client';
import { upsertGcin } from '@/lib/db/reviews';
import { gcinSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req, { userId }) => {
  const input = gcinSchema.parse(await readJson(req));
  return NextResponse.json({ gcin: await upsertGcin(getDb(), userId, input) });
});
