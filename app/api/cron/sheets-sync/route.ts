import { cronHandler } from '@/lib/api/cron';

export const dynamic = 'force-dynamic';

/** 17:15 Asia/Phnom_Penh = 10:15 UTC (vercel.json). Upserts this month's tasks into Google Sheets. */
export const GET = cronHandler('sheets-sync');
