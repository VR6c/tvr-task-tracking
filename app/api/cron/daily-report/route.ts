import { cronHandler } from '@/lib/api/cron';

export const dynamic = 'force-dynamic';

/** 17:00 Asia/Phnom_Penh = 10:00 UTC (vercel.json). Sends "List all task today (date)". */
export const GET = cronHandler('daily-report');
