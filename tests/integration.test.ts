import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { tasks } from '@/db/schema';
import { createDatabase, type Database } from '@/lib/db/client';

/**
 * End-to-end checks against a real PostgreSQL. Skipped unless TEST_DATABASE_URL is set, e.g.
 *   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/tvr_test npm test
 * The target database is wiped between tests - never point this at real data.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const BOT_TOKEN = '123456789:AAH-integration-token';
const ALLOWED = 100200300;
const FOREIGN = 555000111;
const WEBHOOK_SECRET = 'hook-secret';
const CRON_SECRET = 'cron-secret-value';

function signedInitData(userId: number, token = BOT_TOKEN): string {
  const fields: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: 'Test' }),
  };
  const check = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

function call(path: string, init: { method?: string; auth?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.auth ? { authorization: init.auth } : {}),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

const noParams = { params: Promise.resolve({}) };
const AUTH = () => signedInitData(ALLOWED);

describe.skipIf(!TEST_URL)('API against a real database', () => {
  let db: Database;
  let close: () => Promise<void>;
  let routes: {
    tasks: typeof import('@/app/api/tasks/route');
    task: typeof import('@/app/api/tasks/[id]/route');
    weekly: typeof import('@/app/api/weekly/route');
    gcin: typeof import('@/app/api/weekly/gcin/route');
    kpi: typeof import('@/app/api/monthly/kpi/route');
    narrative: typeof import('@/app/api/monthly/narrative/route');
    bot: typeof import('@/app/api/bot/route');
    daily: typeof import('@/app/api/cron/daily-digest/route');
  };

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: TEST_URL,
      BOT_TOKEN,
      ALLOWED_TELEGRAM_USER_ID: String(ALLOWED),
      WEBHOOK_SECRET,
      NEXT_PUBLIC_APP_URL: 'https://app.example.com',
      CRON_SECRET,
    });
    ({ db, close } = createDatabase(TEST_URL as string));
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`drop schema if exists drizzle cascade`);
    await db.execute(sql`create schema public`);
    await migrate(db, { migrationsFolder: 'db/migrations' });
    routes = {
      tasks: await import('@/app/api/tasks/route'),
      task: await import('@/app/api/tasks/[id]/route'),
      weekly: await import('@/app/api/weekly/route'),
      gcin: await import('@/app/api/weekly/gcin/route'),
      kpi: await import('@/app/api/monthly/kpi/route'),
      narrative: await import('@/app/api/monthly/narrative/route'),
      bot: await import('@/app/api/bot/route'),
      daily: await import('@/app/api/cron/daily-digest/route'),
    };
  });

  beforeEach(async () => {
    await db.execute(sql`truncate tasks, weekly_reviews, monthly_summaries`);
  });

  afterAll(async () => {
    await close();
  });

  const createTask = async (body: Record<string, unknown>) => {
    const res = await routes.tasks.POST(call('/api/tasks', { method: 'POST', auth: AUTH(), body }), noParams);
    return { res, json: (await res.json()) as { task: { id: string; completedAt: string | null; monthYear: string } } };
  };

  describe('authentication', () => {
    it('401 without credentials or with a forged signature', async () => {
      const none = await routes.tasks.GET(call('/api/tasks?date=2026-11-03'), noParams);
      expect(none.status).toBe(401);
      expect(await none.json()).toEqual({ error: expect.any(String), code: 'UNAUTHORIZED' });

      const forged = await routes.tasks.GET(
        call('/api/tasks?date=2026-11-03', { auth: signedInitData(ALLOWED, '1:other-token') }),
        noParams,
      );
      expect(forged.status).toBe(401);
    });

    it('403 for a correctly signed foreign Telegram user', async () => {
      const res = await routes.tasks.GET(call('/api/tasks?date=2026-11-03', { auth: signedInitData(FOREIGN) }), noParams);
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ code: 'FORBIDDEN' });
    });

    it('200 for the allowed user; dev mock works outside production only', async () => {
      const ok = await routes.tasks.GET(call('/api/tasks?date=2026-11-03', { auth: AUTH() }), noParams);
      expect(ok.status).toBe(200);
      const mock = await routes.tasks.GET(call('/api/tasks?date=2026-11-03', { auth: 'dev-mock' }), noParams);
      expect(mock.status).toBe(200);
      const mockForeign = await routes.tasks.GET(call('/api/tasks?date=2026-11-03', { auth: `dev-mock:${FOREIGN}` }), noParams);
      expect(mockForeign.status).toBe(403);

      (process.env as Record<string, string>).NODE_ENV = 'production';
      try {
        const prod = await routes.tasks.GET(call('/api/tasks?date=2026-11-03', { auth: 'dev-mock' }), noParams);
        expect(prod.status).toBe(401);
      } finally {
        (process.env as Record<string, string>).NODE_ENV = 'test';
      }
    });

    it('webhook and cron routes reject missing or wrong secrets', async () => {
      const bot = await routes.bot.POST(new Request('http://localhost/api/bot', { method: 'POST', body: '{}' }));
      expect(bot.status).toBe(401);
      const badBot = await routes.bot.POST(
        new Request('http://localhost/api/bot', {
          method: 'POST',
          body: '{}',
          headers: { 'x-telegram-bot-api-secret-token': 'nope' },
        }),
      );
      expect(badBot.status).toBe(401);
      const cron = await routes.daily.GET(new Request('http://localhost/api/cron/daily-digest'));
      expect(cron.status).toBe(401);
      const badCron = await routes.daily.GET(
        new Request('http://localhost/api/cron/daily-digest', { headers: { authorization: 'Bearer wrong' } }),
      );
      expect(badCron.status).toBe(401);
    });
  });

  describe('tasks', () => {
    it('creates, lists by date and derives month_year', async () => {
      const { res, json } = await createTask({
        title: '[Product Team] Zoom QR when scan',
        category: 'milestone_feature',
        environment: 'TestFlight',
        status: 'Feedback',
        buildVersion: 'v2.5.15 build 667',
        scheduledDate: '2026-10-30',
      });
      expect(res.status).toBe(201);
      expect(json.task.monthYear).toBe('2026-10');

      const list = await routes.tasks.GET(call('/api/tasks?date=2026-10-30', { auth: AUTH() }), noParams);
      const body = (await list.json()) as { tasks: { title: string }[] };
      expect(body.tasks.map((t) => t.title)).toEqual(['[Product Team] Zoom QR when scan']);

      const other = await routes.tasks.GET(call('/api/tasks?date=2026-10-31', { auth: AUTH() }), noParams);
      expect(((await other.json()) as { tasks: unknown[] }).tasks).toEqual([]);
    });

    it('validates input with a consistent error shape', async () => {
      const bad = await routes.tasks.POST(
        call('/api/tasks', { method: 'POST', auth: AUTH(), body: { title: '', category: 'nope' } }),
        noParams,
      );
      expect(bad.status).toBe(422);
      expect(await bad.json()).toEqual({ error: expect.stringContaining('title'), code: 'VALIDATION_ERROR' });

      const badDate = await routes.tasks.GET(call('/api/tasks?date=03-11-2026', { auth: AUTH() }), noParams);
      expect(badDate.status).toBe(422);
    });

    it('PATCH sets completed_at on Done/Success and clears it on revert', async () => {
      const { json } = await createTask({ title: 'Smoke', category: 'quick_test' });
      const id = json.task.id;
      const patch = (body: unknown) =>
        routes.task.PATCH(call(`/api/tasks/${id}`, { method: 'PATCH', auth: AUTH(), body }), {
          params: Promise.resolve({ id }),
        });

      const done = (await (await patch({ status: 'Done' })).json()) as { task: { completedAt: string | null } };
      expect(done.task.completedAt).not.toBeNull();
      const success = (await (await patch({ status: 'Success' })).json()) as { task: { completedAt: string | null } };
      expect(success.task.completedAt).toBe(done.task.completedAt);
      const reverted = (await (await patch({ status: 'Feedback' })).json()) as { task: { completedAt: string | null } };
      expect(reverted.task.completedAt).toBeNull();

      const flagged = (await (await patch({ isOverDeadline: true, issueRemark: 'Late build' })).json()) as {
        task: { isOverDeadline: boolean; issueRemark: string };
      };
      expect(flagged.task).toMatchObject({ isOverDeadline: true, issueRemark: 'Late build' });
    });

    it('404 for unknown ids and tasks owned by someone else', async () => {
      const missing = '11111111-1111-4111-8111-111111111111';
      const res = await routes.task.PATCH(
        call(`/api/tasks/${missing}`, { method: 'PATCH', auth: AUTH(), body: { status: 'Done' } }),
        { params: Promise.resolve({ id: missing }) },
      );
      expect(res.status).toBe(404);

      const [foreign] = await db
        .insert(tasks)
        .values({ telegramUserId: FOREIGN, title: 'Not yours', category: 'quick_test', scheduledDate: '2026-11-03', monthYear: '2026-11' })
        .returning();
      const stolen = await routes.task.PATCH(
        call(`/api/tasks/${foreign?.id}`, { method: 'PATCH', auth: AUTH(), body: { status: 'Done' } }),
        { params: Promise.resolve({ id: foreign?.id ?? '' }) },
      );
      expect(stolen.status).toBe(404);

      const list = await routes.tasks.GET(call('/api/tasks?date=2026-11-03', { auth: AUTH() }), noParams);
      expect(((await list.json()) as { tasks: unknown[] }).tasks).toEqual([]);

      const malformed = await routes.task.PATCH(
        call('/api/tasks/not-a-uuid', { method: 'PATCH', auth: AUTH(), body: { status: 'Done' } }),
        { params: Promise.resolve({ id: 'not-a-uuid' }) },
      );
      expect(malformed.status).toBe(404);
    });

    it('the database refuses a month_year that disagrees with scheduled_date', async () => {
      await expect(
        db.insert(tasks).values({
          telegramUserId: ALLOWED,
          title: 'bad',
          category: 'quick_test',
          scheduledDate: '2026-10-30',
          monthYear: '2026-11',
        }),
      ).rejects.toThrow();
    });
  });

  describe('weekly', () => {
    it('aggregates the Monday-Sunday window and upserts GCIN', async () => {
      await createTask({ title: 'Done Mon', category: 'quick_test', status: 'Done', scheduledDate: '2026-11-02' });
      await createTask({ title: 'Carry over', category: 'quick_test', status: 'Feedback', scheduledDate: '2026-10-28' });
      await createTask({ title: 'Old done', category: 'quick_test', status: 'Done', scheduledDate: '2026-10-28' });
      await createTask({
        title: 'Issue',
        category: 'production_bug',
        status: 'Feedback',
        scheduledDate: '2026-11-04',
        issueRemark: 'Crash',
      });

      const res = await routes.weekly.GET(call('/api/weekly?startDate=2026-11-02&endDate=2026-11-08', { auth: AUTH() }), noParams);
      const view = (await res.json()) as {
        sections: Record<'achievements' | 'plan' | 'tracking' | 'issues', { title: string }[]>;
        gcin: Record<string, string>;
      };
      expect(view.sections.achievements.map((t) => t.title)).toEqual(['Done Mon']);
      expect(view.sections.plan.map((t) => t.title)).toEqual(['Carry over', 'Issue']);
      expect(view.sections.issues.map((t) => t.title)).toEqual(['Issue']);
      expect(view.gcin).toEqual({ good: '', challenge: '', improvement: '', nextAction: '' });

      const save = (body: Record<string, string>) =>
        routes.gcin.POST(
          call('/api/weekly/gcin', {
            method: 'POST',
            auth: AUTH(),
            body: { weekStartDate: '2026-11-02', weekEndDate: '2026-11-08', ...body },
          }),
          noParams,
        );
      expect((await save({ good: 'First', challenge: 'c', improvement: 'i', nextAction: 'n' })).status).toBe(200);
      expect((await save({ good: 'Second', challenge: 'c2', improvement: 'i2', nextAction: 'n2' })).status).toBe(200);

      const rows = await db.execute(sql`select count(*)::int as n from weekly_reviews`);
      expect(rows[0]).toMatchObject({ n: 1 });

      const again = await routes.weekly.GET(call('/api/weekly?startDate=2026-11-02&endDate=2026-11-08', { auth: AUTH() }), noParams);
      expect(((await again.json()) as { gcin: { good: string } }).gcin.good).toBe('Second');
    });

    it('422 when the window is not Monday-Sunday', async () => {
      const res = await routes.weekly.GET(call('/api/weekly?startDate=2026-11-03&endDate=2026-11-09', { auth: AUTH() }), noParams);
      expect(res.status).toBe(422);
    });
  });

  describe('monthly', () => {
    it('computes KPIs, never recounts a task in the next month, and upserts narratives', async () => {
      // Scheduled 30 Oct, finished later -> belongs to October only.
      const { json } = await createTask({ title: 'Sign-off', category: 'milestone_feature', scheduledDate: '2026-10-30' });
      await routes.task.PATCH(
        call(`/api/tasks/${json.task.id}`, { method: 'PATCH', auth: AUTH(), body: { status: 'Success' } }),
        { params: Promise.resolve({ id: json.task.id }) },
      );
      await createTask({ title: 'Late fix', category: 'production_bug', status: 'Done', scheduledDate: '2026-10-12' });
      await routes.tasks.POST(
        call('/api/tasks', {
          method: 'POST',
          auth: AUTH(),
          body: { title: 'Over', category: 'idea_propose', status: 'Done', scheduledDate: '2026-10-05', isOverDeadline: true },
        }),
        noParams,
      );

      const kpi = async (month: string) =>
        (await (await routes.kpi.GET(call(`/api/monthly/kpi?month=${month}`, { auth: AUTH() }), noParams)).json()) as {
          weeksInMonth: number;
          kpis: { key: string; actual: number; status: string; good: number; excellence: number }[];
          audit: { onTime: { title: string }[]; overDeadline: { title: string }[] };
        };

      const october = await kpi('2026-10');
      const november = await kpi('2026-11');
      const feature = (r: typeof october) => r.kpis.find((k) => k.key === 'new_feature')?.actual;
      expect(feature(october)).toBe(1);
      expect(feature(november)).toBe(0);
      expect(october.kpis.find((k) => k.key === 'production_error')).toMatchObject({ actual: 1, good: 4, excellence: 12, status: 'Under' });
      expect(october.kpis.find((k) => k.key === 'new_idea')).toMatchObject({ actual: 1, status: 'Good' });
      expect(october.audit.overDeadline.map((t) => t.title)).toEqual(['Over']);
      expect(october.audit.onTime.map((t) => t.title).sort()).toEqual(['Late fix', 'Sign-off']);
      expect(november.audit.onTime).toEqual([]);

      const save = (body: Record<string, string>) =>
        routes.narrative.POST(call('/api/monthly/narrative', { method: 'POST', auth: AUTH(), body: { month: '2026-10', ...body } }), noParams);
      expect((await save({ challenges: 'A', successStories: 'B' })).status).toBe(200);
      expect((await save({ challenges: 'A2', successStories: 'B2' })).status).toBe(200);
      const view = (await (await routes.kpi.GET(call('/api/monthly/kpi?month=2026-10', { auth: AUTH() }), noParams)).json()) as {
        narrative: { challenges: string; successStories: string };
      };
      expect(view.narrative).toEqual({ challenges: 'A2', successStories: 'B2' });
      const rows = await db.execute(sql`select count(*)::int as n from monthly_summaries`);
      expect(rows[0]).toMatchObject({ n: 1 });
    });
  });

  describe('bot', () => {
    interface Call {
      method: string;
      payload: Record<string, unknown>;
    }

    async function makeBot() {
      const { createBot } = await import('@/lib/telegram/bot');
      const bot = createBot();
      const calls: Call[] = [];
      bot.botInfo = {
        id: 1,
        is_bot: true,
        first_name: 'TVR',
        username: 'tvr_bot',
        can_join_groups: false,
        can_read_all_group_messages: false,
        supports_inline_queries: false,
        can_connect_to_business: false,
        has_main_web_app: false,
        has_topics_enabled: false,
        allows_users_to_create_topics: false,
      };
      bot.api.config.use((_prev, method, payload) => {
        calls.push({ method, payload: payload as Record<string, unknown> });
        return Promise.resolve({ ok: true, result: true } as never);
      });
      return { bot, calls };
    }

    const message = (userId: number, text: string, entities?: unknown[]) => ({
      update_id: 1,
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: userId, type: 'private' as const, first_name: 'T' },
        from: { id: userId, is_bot: false, first_name: 'T' },
        text,
        ...(entities ? { entities } : {}),
      },
    });

    it('/start replies with an inline WebApp button', async () => {
      const { bot, calls } = await makeBot();
      await bot.handleUpdate(message(ALLOWED, '/start', [{ type: 'bot_command', offset: 0, length: 6 }]));
      const reply = calls.find((c) => c.method === 'sendMessage');
      expect(JSON.stringify(reply?.payload.reply_markup)).toContain('https://app.example.com/daily');
      expect(JSON.stringify(reply?.payload.reply_markup)).toContain('web_app');
    });

    it('creates a task from a chat message and confirms', async () => {
      const { bot, calls } = await makeBot();
      await bot.handleUpdate(message(ALLOWED, 'Quick Test v2.5.17 build 668 #success'));
      const rows = await db.select().from(tasks);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        title: 'Quick Test v2.5.17 build 668',
        category: 'quick_test',
        status: 'Success',
        environment: 'TestFlight',
        buildVersion: 'v2.5.17 build 668',
        telegramUserId: ALLOWED,
      });
      expect(rows[0]?.completedAt).not.toBeNull();
      expect(String(calls.find((c) => c.method === 'sendMessage')?.payload.text)).toContain('Logged');
    });

    it('explains malformed input instead of inserting', async () => {
      const { bot, calls } = await makeBot();
      await bot.handleUpdate(message(ALLOWED, '#success'));
      expect(await db.select().from(tasks)).toHaveLength(0);
      expect(String(calls.find((c) => c.method === 'sendMessage')?.payload.text)).toContain('could not turn that into a task');
    });

    it('ignores other Telegram users', async () => {
      const { bot, calls } = await makeBot();
      await bot.handleUpdate(message(FOREIGN, 'Quick Test #success'));
      expect(await db.select().from(tasks)).toHaveLength(0);
      expect(String(calls[0]?.payload.text)).toContain('private bot');
    });
  });
});
