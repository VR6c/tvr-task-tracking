import { cronHandler } from '@/lib/api/cron';

export const dynamic = 'force-dynamic';

/** 08:30 Asia/Phnom_Penh = 01:30 UTC (vercel.json). */
export const GET = cronHandler('daily-digest');
