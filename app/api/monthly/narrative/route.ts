import { NextResponse } from 'next/server';
import { readJson } from '@/lib/api/errors';
import { withAuth } from '@/lib/auth/with-auth';
import { getDb } from '@/lib/db/client';
import { upsertNarrative } from '@/lib/db/reviews';
import { narrativeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req, { userId }) => {
  const input = narrativeSchema.parse(await readJson(req));
  return NextResponse.json({ narrative: await upsertNarrative(getDb(), userId, input) });
});
