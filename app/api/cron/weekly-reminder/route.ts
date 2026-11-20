import { cronHandler } from '@/lib/api/cron';

export const dynamic = 'force-dynamic';

/** Saturday 10:00 Asia/Phnom_Penh = 03:00 UTC Saturday (vercel.json). */
export const GET = cronHandler('weekly-reminder');
