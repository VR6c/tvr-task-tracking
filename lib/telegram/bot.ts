import { Api, Bot, InlineKeyboard, webhookCallback, type Context } from 'grammy';
import { CATEGORY_LABELS, ENVIRONMENT_LABELS } from '@/lib/constants';
import { getDb } from '@/lib/db/client';
import { createTask, listTasksByDate } from '@/lib/db/tasks';
import { loadMonthlyView, loadWeeklyView } from '@/lib/db/views';
import { getEnv } from '@/lib/env';
import { formatWeeklySlide } from '@/lib/formatters/weekly-slide';
import { toTaskDTO } from '@/lib/tasks';
import { chunkMessage, formatDailyTaskList } from '@/lib/telegram/daily-report';
import { formatKpiSummary } from '@/lib/telegram/kpi-summary';
import { MENU, buildQuickMenu } from '@/lib/telegram/menu';
import { PARSE_HELP, parseTaskMessage } from '@/lib/telegram/parser';
import { monthYearOf, todayInTimezone, weekRange } from '@/lib/week-utils';

export function miniAppUrl(path = '/daily'): string {
  return `${getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}${path}`;
}

export function openAppKeyboard(label = 'Open Task Tracking', path = '/daily'): InlineKeyboard {
  return new InlineKeyboard().webApp(label, miniAppUrl(path));
}

const MENU_READY = 'Quick menu is ready. Use the buttons below, or just type a task to log it.';

export function createBot(): Bot {
  const { BOT_TOKEN, ALLOWED_TELEGRAM_USER_ID, TELEGRAM_API_ROOT } = getEnv();
  const bot = new Bot(BOT_TOKEN, { client: { apiRoot: TELEGRAM_API_ROOT } });

  // Single-user bot: ignore everyone else (FR-AUTH-02 applies to the bot as well).
  bot.use(async (ctx, next) => {
    if (ctx.from?.id !== ALLOWED_TELEGRAM_USER_ID) {
      if (ctx.chat?.type === 'private') await ctx.reply('This is a private bot.');
      return;
    }
    await next();
  });

  const sendMenu = (ctx: Context) => ctx.reply(MENU_READY, { reply_markup: buildQuickMenu(miniAppUrl()) });

  const sendTodayTasks = async (ctx: Context) => {
    const date = todayInTimezone();
    const rows = await listTasksByDate(getDb(), ALLOWED_TELEGRAM_USER_ID, date);
    for (const text of chunkMessage(formatDailyTaskList(date, rows.map(toTaskDTO)))) {
      await ctx.reply(text, { parse_mode: 'Markdown' });
    }
  };

  const sendWeek = async (ctx: Context) => {
    const range = weekRange(todayInTimezone());
    const view = await loadWeeklyView(getDb(), ALLOWED_TELEGRAM_USER_ID, range.start, range.end);
    const chunks = chunkMessage(formatWeeklySlide(range.start, view.sections, view.gcin));
    for (const [index, text] of chunks.entries()) {
      const isLast = index === chunks.length - 1;
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        ...(isLast ? { reply_markup: openAppKeyboard('Open weekly review', '/weekly') } : {}),
      });
    }
  };

  const sendKpis = async (ctx: Context) => {
    const view = await loadMonthlyView(getDb(), ALLOWED_TELEGRAM_USER_ID, monthYearOf(todayInTimezone()));
    await ctx.reply(formatKpiSummary(view), { parse_mode: 'Markdown', reply_markup: openAppKeyboard('Open KPIs', '/monthly') });
  };

  bot.command('start', async (ctx) => {
    await ctx.reply(
      [
        '*TVR Task Tracking*',
        '',
        'Open the app to log tasks, run your weekly GCIN and check monthly KPIs.',
        'You can also message me a task, e.g. `Quick Test v2.5.17 build 668 #success`.',
      ].join('\n'),
      { parse_mode: 'Markdown', reply_markup: openAppKeyboard() },
    );
    await sendMenu(ctx);
  });

  bot.command('help', (ctx) => ctx.reply(PARSE_HELP, { reply_markup: openAppKeyboard() }));

  // Quick Menu: registered before the free-text task parser so button taps are never logged as tasks.
  bot.command('menu', sendMenu);
  bot.command('today', sendTodayTasks);
  bot.command('week', sendWeek);
  bot.command('kpi', sendKpis);
  bot.hears(MENU.today, sendTodayTasks);
  bot.hears(MENU.week, sendWeek);
  bot.hears(MENU.kpi, sendKpis);

  bot.on('message:text', async (ctx) => {
    const parsed = parseTaskMessage(ctx.message.text);
    if (!parsed.ok) {
      const text =
        parsed.reason === 'too_long'
          ? 'That message is too long for a task title (255 characters max).'
          : PARSE_HELP;
      await ctx.reply(text);
      return;
    }
    const { task } = parsed;
    const row = await createTask(getDb(), ALLOWED_TELEGRAM_USER_ID, { ...task, isOverDeadline: false });
    const details = [
      CATEGORY_LABELS[row.category],
      ENVIRONMENT_LABELS[row.environment],
      row.buildVersion,
      row.status,
    ].filter(Boolean);
    await ctx.reply(
      [
        `Logged for ${todayInTimezone()}: ${row.title}`,
        details.join(' · '),
        row.issueRemark ? `Issue: ${row.issueRemark}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      { reply_markup: openAppKeyboard('Open today', '/daily') },
    );
  });

  bot.catch((err) => console.error('Bot handler error', err.error));
  return bot;
}

const globalForBot = globalThis as unknown as { __tvrWebhook?: (req: Request) => Promise<Response> };

/** grammY's std/http adapter works with the Web Request/Response objects Next.js route handlers use. */
export function getWebhookHandler(): (req: Request) => Promise<Response> {
  if (!globalForBot.__tvrWebhook) {
    globalForBot.__tvrWebhook = webhookCallback(createBot(), 'std/http');
  }
  return globalForBot.__tvrWebhook;
}

export function getTelegramApi(): Api {
  const { BOT_TOKEN, TELEGRAM_API_ROOT } = getEnv();
  return new Api(BOT_TOKEN, { apiRoot: TELEGRAM_API_ROOT });
}
