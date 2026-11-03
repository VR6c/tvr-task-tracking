import '../scripts/load-env';
import { eq } from 'drizzle-orm';
import { tasks } from './schema';
import { createDatabase } from '../lib/db/client';
import { buildNewTask } from '../lib/tasks';
import type { CreateTaskInput } from '../lib/validation';
import { addDays, todayInTimezone } from '../lib/week-utils';

/** Development sample data. Dates are relative to today so every screen has content. */
type Sample = Omit<CreateTaskInput, 'scheduledDate' | 'isOverDeadline'> & { daysAgo: number; over?: boolean };

const SAMPLES: Sample[] = [
  { daysAgo: 0, title: '[Chat] Regression - send voice message', category: 'quick_test', environment: 'TestFlight', status: 'Done', buildVersion: 'v2.5.17 build 668', issueRemark: null },
  { daysAgo: 0, title: '[Product Team] Zoom QR when scan', category: 'milestone_feature', environment: 'TestFlight', status: 'Feedback', buildVersion: 'v2.5.17 build 668', issueRemark: null },
  { daysAgo: 0, title: '[Chat] Member Not Found on profile', category: 'production_bug', environment: 'Production', status: 'Success', buildVersion: null, issueRemark: '[Chat] Member Not Found on profile' },
  { daysAgo: 0, title: 'Propose shared device-matrix sheet', category: 'idea_propose', environment: 'Development', status: 'Feedback', buildVersion: null, issueRemark: null },
  { daysAgo: 1, title: '[Payments] Wallet top-up smoke test', category: 'quick_test', environment: 'TestFlight', status: 'Success', buildVersion: 'v2.5.16 build 667', issueRemark: null },
  { daysAgo: 1, title: '[Auth] OTP resend cooldown edge case', category: 'milestone_feature', environment: 'Development', status: 'Feedback', buildVersion: null, issueRemark: 'OTP resend allowed twice within 30s', over: true },
  { daysAgo: 2, title: '[Feed] Pull-to-refresh duplicates posts', category: 'production_bug', environment: 'Production', status: 'Done', buildVersion: null, issueRemark: 'Duplicate posts after pull-to-refresh on slow network' },
  { daysAgo: 3, title: 'Draft regression test template v2', category: 'research_doc', environment: 'Development', status: 'Done', buildVersion: null, issueRemark: null },
  { daysAgo: 4, title: '[Check-in] Offline queue sign-off', category: 'milestone_feature', environment: 'TestFlight', status: 'Success', buildVersion: 'v2.5.15 build 665', issueRemark: null },
  { daysAgo: 6, title: '[Notifications] Push opens wrong tab', category: 'production_bug', environment: 'Production', status: 'Done', buildVersion: null, issueRemark: 'Push deep link opens Home instead of Chat' },
  { daysAgo: 8, title: 'Quick Test v2.5.14 build 662', category: 'quick_test', environment: 'TestFlight', status: 'Success', buildVersion: 'v2.5.14 build 662', issueRemark: null },
  { daysAgo: 9, title: '[Profile] Avatar crop on small screens', category: 'milestone_feature', environment: 'TestFlight', status: 'Done', buildVersion: 'v2.5.14 build 662', issueRemark: null, over: true },
  { daysAgo: 12, title: 'Idea: automate smoke checklist via bot', category: 'idea_propose', environment: 'Development', status: 'Done', buildVersion: null, issueRemark: null },
  { daysAgo: 15, title: '[Chat] Message ordering after reconnect', category: 'production_bug', environment: 'Production', status: 'Success', buildVersion: null, issueRemark: 'Messages reorder after reconnect' },
  { daysAgo: 20, title: 'Quick Test v2.5.12 build 655', category: 'quick_test', environment: 'TestFlight', status: 'Done', buildVersion: 'v2.5.12 build 655', issueRemark: null },
  { daysAgo: 24, title: 'Bug-report template research', category: 'research_doc', environment: 'Development', status: 'Success', buildVersion: null, issueRemark: null },
  { daysAgo: 31, title: '[Search] Filter chips reset on back', category: 'milestone_feature', environment: 'TestFlight', status: 'Success', buildVersion: 'v2.5.10 build 650', issueRemark: null },
  { daysAgo: 33, title: '[Search] Empty state copy review', category: 'quick_test', environment: 'Development', status: 'Feedback', buildVersion: null, issueRemark: null },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed sample data in production.');
  const url = process.env.DATABASE_URL;
  const userId = Number(process.env.ALLOWED_TELEGRAM_USER_ID);
  if (!url || !Number.isInteger(userId) || userId <= 0) {
    throw new Error('DATABASE_URL and ALLOWED_TELEGRAM_USER_ID must be set');
  }

  const { db, close } = createDatabase(url);
  try {
    const existing = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.telegramUserId, userId)).limit(1);
    if (existing.length && !process.argv.includes('--reset')) {
      console.log('Tasks already exist for this user. Re-run with --reset to replace them with sample data.');
      return;
    }
    if (existing.length) await db.delete(tasks).where(eq(tasks.telegramUserId, userId));

    const today = todayInTimezone();
    const now = new Date();
    const rows = SAMPLES.map(({ daysAgo, over, ...sample }) =>
      buildNewTask(
        { ...sample, scheduledDate: addDays(today, -daysAgo), isOverDeadline: over ?? false },
        userId,
        now,
      ),
    );
    await db.insert(tasks).values(rows);
    console.log(`Seeded ${rows.length} sample tasks for user ${userId}.`);
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
