# TVR Task Tracking

A single-user **Telegram Mini App + bot** for a junior QA engineer: log daily testing tasks, run the weekly **GCIN** retrospective (Good / Challenge / Improvement / Next action) and see monthly **KPI** results — with one-tap copy for the daily standup and the weekly slide.

Built from `software_requirements_specification_srs.txt` (the source of truth).

| | |
|---|---|
| **Frontend** | Next.js 16 (App Router, TypeScript strict), Tailwind CSS 4, lucide-react, `@telegram-apps/sdk-react`, responsive desktop sidebar & mobile layout |
| **Backend** | Next.js route handlers, Zod validation, Drizzle ORM + drizzle-kit, PostgreSQL (Neon / Supabase compatible) |
| **Bot** | grammY webhook adapter at `app/api/bot/route.ts` with Quick Menu & slash commands |
| **Tests** | Vitest (11 test suites: unit + real-database integration) |

## Contents

1. [Quick start (local)](#quick-start-local)
2. [Environment variables](#environment-variables)
3. [Scripts](#scripts)
4. [Database & migrations](#database--migrations)
5. [BotFather setup](#botfather-setup)
6. [Webhook registration](#webhook-registration)
7. [Local testing with a tunnel](#local-testing-with-a-tunnel)
8. [Deploy to Vercel + Neon (≈ 20 min)](#deploy-to-vercel--neon)
9. [Cron schedules & time zone](#cron-schedules--time-zone)
10. [Quick Menu & bot commands](#quick-menu--bot-commands)
11. [Bot message syntax](#bot-message-syntax)
12. [API reference](#api-reference)
13. [Testing](#testing)
14. [Security model](#security-model)
15. [Project layout](#project-layout)
16. [Assumptions](#assumptions)

## Quick start (local)

Requirements: **Node.js ≥ 20.9** (22 recommended) and a PostgreSQL database (local, Neon or Supabase).

```bash
npm install
cp .env.example .env.local        # then edit the values (see below)
npm run db:migrate                # create tables
npm run db:seed                   # optional: realistic sample QA tasks (development only)
npm run dev                       # http://localhost:3000
```

Open <http://localhost:3000/daily> in a normal browser. In development (`NODE_ENV !== 'production'`) the app falls back to a **mock auth mode** so it works outside Telegram: the client sends `Authorization: dev-mock`, which the API treats as `ALLOWED_TELEGRAM_USER_ID`. This path is compiled out of the production bundle and rejected by the API when `NODE_ENV=production`. To exercise the 403 path from a terminal use `Authorization: dev-mock:<other-user-id>`.

Quick local Postgres with Docker:

```bash
docker run -d --name tvr-pg -e POSTGRES_USER=tvr -e POSTGRES_PASSWORD=tvr -e POSTGRES_DB=tvr_task_tracking -p 5432:5432 postgres:16
# DATABASE_URL=postgres://tvr:tvr@localhost:5432/tvr_task_tracking
```

## Environment variables

Copy `.env.example` to `.env.local`. All are **server-side only**; nothing here is exposed to the browser except the public app URL.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. Use the **pooled** URL on serverless (Neon pooled / Supabase pooler). |
| `BOT_TOKEN` | yes | Token from @BotFather. Used for the bot **and** to derive the initData HMAC key. |
| `ALLOWED_TELEGRAM_USER_ID` | yes | The one Telegram user ID allowed in (get it from @userinfobot). Everyone else gets HTTP 403. |
| `WEBHOOK_SECRET` | yes | Random string (`A-Z a-z 0-9 _ -`, ≤256 chars). Telegram sends it in `X-Telegram-Bot-Api-Secret-Token`; `/api/bot` rejects anything else. |
| `NEXT_PUBLIC_APP_URL` | yes | Public **https** URL of the app, no trailing slash. Used for the WebApp buttons and `bot:setup`. |
| `CRON_SECRET` | yes | Bearer secret for `/api/cron/*`. Vercel sends it automatically. |
| `TELEGRAM_API_ROOT` | no | Custom Bot API server (defaults to `https://api.telegram.org`). Used by the integration tests. |

Generate secrets with `openssl rand -hex 32`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run lint` | ESLint (flat config, `no-explicit-any` enforced) |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm test` | Vitest (unit tests; integration tests run when `TEST_DATABASE_URL` is set) |
| `npm run test:watch` | Vitest interactive watch mode |
| `npm run db:generate` | Generate a SQL migration from `db/schema.ts` |
| `npm run db:migrate` | Apply migrations in `db/migrations` to `DATABASE_URL` |
| `npm run db:seed` | Insert sample tasks (refuses in production; `-- --reset` replaces existing tasks) |
| `npm run bot:setup` | Register the webhook + menu button + commands (`-- --delete` removes the webhook) |

## Database & migrations

Schema lives in `db/schema.ts` and matches SRS §4 exactly (3 enums, `tasks`, `weekly_reviews`, `monthly_summaries`, the two unique constraints). Additions beyond the SRS: two indexes on `tasks`, and a `CHECK` that `tasks.month_year = to_char(scheduled_date, 'YYYY-MM')` so a task can never be tagged with the wrong month (NFR-03).

```bash
npm run db:generate   # after editing db/schema.ts; commits a new file under db/migrations
npm run db:migrate    # applies pending migrations (idempotent)
```

`month_year` is derived from `scheduled_date` in code (`lib/tasks.ts`) on insert; the database constraint enforces it.

## BotFather setup

1. In Telegram open **@BotFather** → `/newbot` → pick a name and a username → copy the **token** into `BOT_TOKEN`.
2. Get your numeric user ID from **@userinfobot** → `ALLOWED_TELEGRAM_USER_ID`.
3. (Optional) `/setdescription`, `/setuserpic`. You do **not** need `/newapp` or `/setdomain`: the app is opened from the bot's inline WebApp button and the menu button, both configured by `npm run bot:setup`.

## Webhook registration

After the app is reachable over HTTPS and the env vars are set:

```bash
npm run bot:setup
```

This calls `setWebhook` (with `secret_token = WEBHOOK_SECRET`, `allowed_updates = ["message"]`), `setChatMenuButton` (a **Tasks** button opening `/daily`) and `setMyCommands`. It prints the registered URL and any error Telegram reports. Run it again whenever `NEXT_PUBLIC_APP_URL` changes. `npm run bot:setup -- --delete` removes the webhook.

## Local testing with a tunnel

Telegram only opens HTTPS Mini Apps, so expose your dev server:

```bash
npm run dev
ngrok http 3000            # or: cloudflared tunnel --url http://localhost:3000
```

1. Put the tunnel URL in `.env.local` as `NEXT_PUBLIC_APP_URL` (e.g. `https://abc123.ngrok-free.app`).
2. `npm run bot:setup` to point the webhook and menu button at the tunnel.
3. Send `/start` to your bot and tap **Open Task Tracking**. Inside Telegram the real `initData` is used (no mock mode) and only `ALLOWED_TELEGRAM_USER_ID` is let in.
4. Send the bot a message such as `Quick Test v2.5.17 build 668 #success` and refresh the Daily tab.

`next.config.ts` already lists ngrok / cloudflared / localtunnel hosts in `allowedDevOrigins`; add your own domain there if you use something else.

Trigger the cron routes manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-digest
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-report
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/weekly-reminder
```

## Deploy to Vercel + Neon

1. **Neon**: create a project → copy the **pooled** connection string (`…-pooler…neon.tech/…?sslmode=require`).
2. **Migrate** the production database from your machine:
   ```bash
   DATABASE_URL="<neon pooled url>" npm run db:migrate
   ```
   (Do **not** run `db:seed` against production.)
3. **Vercel**: *Add New → Project* → import this repo (framework preset: Next.js, no custom build command).
4. Add the environment variables from the table above for **Production**. Set `NEXT_PUBLIC_APP_URL` to the final URL (e.g. `https://tvr-task-tracking.vercel.app`).
5. Deploy. `vercel.json` registers both cron jobs automatically.
6. Register the bot against the live URL:
   ```bash
   NEXT_PUBLIC_APP_URL=https://tvr-task-tracking.vercel.app npm run bot:setup
   ```
   (or put the production values in `.env.local` temporarily).
7. In Telegram: `/start` → **Open Task Tracking**.

Smoke test: open the app → add a task → copy the standup; message the bot a task; `curl` the cron routes with the production `CRON_SECRET`.

## Admin dashboard

The **Admin** tab (`/admin`) controls the bot from inside the Mini App. The admin is the single allowed Telegram user (`ALLOWED_TELEGRAM_USER_ID`); every `/api/admin/*` route uses the same initData check as the rest of the API.

- **Overview**: task totals, open/carry-over/over-deadline counts, current-month category breakdown.
- **Bot**: bot username, webhook URL vs. the expected `NEXT_PUBLIC_APP_URL`, pending updates and the last Telegram error, plus a button that re-runs what `npm run bot:setup` does (webhook, menu button, commands; pending updates are kept).
- **Scheduled messages**: send the daily digest, daily report or weekly reminder now.
- **Tasks**: search by title and delete tasks.

### Web admin (normal browser)

Open `https://<your-app>/admin` in any browser. Without a session you are sent to `/login`, which shows the **Log in with Telegram** button. Only `ALLOWED_TELEGRAM_USER_ID` is accepted; a successful login sets a 7-day httpOnly cookie (`tvr_session`, signed with a key derived from `BOT_TOKEN`, so rotating the token logs every browser out). The Daily/Weekly/Monthly tabs work in the browser too. **Log out** is in the Admin header.

One-time setup: in @BotFather send `/setdomain`, pick the bot and enter your app's domain (e.g. `your-app.vercel.app`, no `https://`). The login widget only renders on that domain, so it does not work on `localhost`; use the deployed URL or your tunnel domain. In `next dev` the browser still uses the `dev-mock` header, so no login is needed locally.

Cookie-authenticated writes (POST/PATCH/DELETE) must carry this app's own `Origin`; cross-site requests get 403.

## Google Sheets sync (optional)

Sends the daily task list to a Google Sheet. Each task is one row keyed by its Task ID (last column), so changing a status updates the same row; new tasks are appended. The current month is synced daily at 17:15 Phnom Penh (`/api/cron/sheets-sync`) and on demand from **Admin → Scheduled jobs → Google Sheets sync**. Tasks deleted in the app are not removed from the Sheet.

1. In Google Cloud, create a project, enable the **Google Sheets API**, create a **service account** and download its JSON key.
2. Create a Sheet and share it with the service account's `client_email` as **Editor**.
3. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL` (`client_email`), `GOOGLE_PRIVATE_KEY` (`private_key`, keep the `\n` escapes) and `GOOGLE_SHEET_ID` (the part of the Sheet URL between `/d/` and `/edit`). `GOOGLE_SHEET_TAB` defaults to `Daily Tasks` and is created if missing.

Without these variables the sync returns a "not configured" error and nothing else is affected.

## Cron schedules & time zone

All user-facing logic (today's date, Monday–Sunday weeks, month boundaries) runs in **Asia/Phnom_Penh** (UTC+7, no DST) — see `APP_TIMEZONE` in `lib/constants.ts`. Vercel cron expressions are **UTC**, so they are shifted by −7 h:

| Digest | Local time (Asia/Phnom_Penh) | `vercel.json` (UTC) | Route |
|---|---|---|---|
| Daily digest | every day 08:30 | `30 1 * * *` | `/api/cron/daily-digest` |
| Daily task report ("List all task today (date)") | every day 17:00 | `0 10 * * *` | `/api/cron/daily-report` |
| Weekly GCIN reminder | Saturday 10:00 | `0 3 * * 6` | `/api/cron/weekly-reminder` |
| Google Sheets sync | every day 17:15 | `15 10 * * *` | `/api/cron/sheets-sync` |

Cambodia has no daylight saving, so the mapping never changes. On Vercel's **Hobby** plan cron jobs run at most once per day, may fire anywhere within the scheduled hour, and a project is limited to **2** cron jobs. This project defines 3, so Hobby needs one removed from `vercel.json` (or use Pro).

## Quick Menu & bot commands

Sending `/start` or `/menu` pins a persistent reply keyboard under the Telegram chat input:

| Button | What it does |
|---|---|
| **Open App** | Launches the Mini App directly (a WebApp button pointing to `/daily`) |
| **Today's Tasks** | Replies with "List all task today (date)" — all tasks scheduled today with completion counter, details, and status |
| **This Week** | Replies with the complete CheckinMe slide format (achievements, plan, tracking, issues, GCIN), plus an inline button to open the Weekly Review |
| **Monthly KPIs** | Replies with the current month's 5 KPIs (actual vs. Good/Excellence targets, status) and deadline audit counts, plus an inline button to open Monthly KPIs |

The same actions exist as slash commands:
- `/start` — Send welcome message, WebApp button, and pin the Quick Menu keyboard
- `/menu` — Re-send and re-pin the Quick Menu keyboard
- `/today` — List today's tasks and status summary
- `/week` — Send this week's review in CheckinMe slide format
- `/kpi` — Send monthly KPI snapshot & deadline audit
- `/help` — Message syntax and logging guide

The keyboard is persistent and stays docked; the chat input placeholder reminds you that typing any message will log it as a new task. Button taps match on label text before the task parser runs, so button clicks are never mistakenly logged as tasks. Run `npm run bot:setup` once to register the command list with BotFather.

## Bot message syntax

Any plain message to the bot becomes a task for today. Examples:

```
Quick Test v2.5.17 build 668 #success
Zoom QR fails on scan #bug issue: camera permission loop
Weekly regression checklist #research #done
Propose shared device matrix
```

| Part | Rules |
|---|---|
| Status | `#success` · `#done` · `#feedback`/`#pending` (default **Feedback**) |
| Category | `#quicktest` `#feature` `#bug` `#idea` `#research`, or keywords in the text (default **Quick Test**) |
| Environment | `#dev` `#testflight` `#prod`; otherwise Production for bugs, TestFlight when a build is mentioned, else Development |
| Build version | `v2.5.17` and/or `build 668` → stored as `v2.5.17 build 668` |
| Issue remark | everything after `issue:` / `remark:` |

Malformed input (empty, only hashtags, a `/command`, >255 characters) gets a help reply and creates nothing. Other Telegram users are told the bot is private.

## API reference

All `/api/*` Mini App routes need `Authorization: <Telegram initData raw string>` and return `{ "error": string, "code": string }` on failure.

| Method & path | Body / query | Success |
|---|---|---|
| `GET /api/tasks?date=YYYY-MM-DD` | — | `200 { date, tasks[] }` |
| `POST /api/tasks` | `{ title, category, environment?, status?, buildVersion?, issueRemark?, scheduledDate?, isOverDeadline? }` | `201 { task }` |
| `PATCH /api/tasks/[id]` | any of `status`, `isOverDeadline`, `issueRemark`, `title`, `category`, `environment`, `buildVersion` | `200 { task }` — sets `completed_at` when status becomes Done/Success (kept when moving Done↔Success), clears it on revert to Feedback |
| `GET /api/weekly?startDate&endDate` | Monday and the following Sunday | `200 { sections: {achievements, plan, tracking, issues}, gcin }` |
| `POST /api/weekly/gcin` | `{ weekStartDate, weekEndDate, good, challenge, improvement, nextAction }` | `200 { gcin }` (upsert) |
| `GET /api/monthly/kpi?month=YYYY-MM` | — | `200 { weeksInMonth, kpis[], audit: {onTime, overDeadline}, narrative }` |
| `POST /api/monthly/narrative` | `{ month, challenges, successStories }` | `200 { narrative }` (upsert) |
| `POST /api/bot` | Telegram update + `X-Telegram-Bot-Api-Secret-Token` | handled by grammY |
| `GET /api/cron/daily-digest` | `Authorization: Bearer $CRON_SECRET` | `200 { sent: true, carryOvers, today }` |
| `GET /api/cron/daily-report` | `Authorization: Bearer $CRON_SECRET` | `200 { sent: true, date, total, done }` |
| `GET /api/cron/weekly-reminder` | `Authorization: Bearer $CRON_SECRET` | `200 { sent: true, weekStartDate, gcinFilled }` |

| Status | `code` | Meaning |
|---|---|---|
| 400 | `INVALID_JSON` | Body is not JSON |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired initData signature (or bad webhook/cron secret) |
| 403 | `FORBIDDEN` | Valid Telegram user, but not `ALLOWED_TELEGRAM_USER_ID` |
| 404 | `NOT_FOUND` | Unknown task id — also returned for tasks owned by someone else |
| 422 | `VALIDATION_ERROR` | Zod validation failed (message lists the fields) |
| 500 | `INTERNAL_ERROR` | Unexpected error (details are logged, never returned) |

## Testing

```bash
npm test                      # unit tests (no database needed)
npm run test:watch            # interactive watch mode
```

Integration tests exercise the real route handlers, grammY webhook, cron routes and Drizzle queries against **PostgreSQL**. They are skipped unless you provide a database — **it is wiped between tests, so use a dedicated empty database**:

```bash
createdb tvr_test
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/tvr_test npm test
```

Coverage highlights (11 test suites, 96 tests: 71 unit + 25 integration):
- **Week & date logic**: ISO week numbering, Monday–Sunday boundaries, month rollover, time zone safety in `Asia/Phnom_Penh`.
- **KPI engine**: Monthly targets, dynamic weekly production-bug scaling by number of weeks in month, Good/Excellence thresholds, deadline audit counts.
- **Bot & parser**: Hashtags (`#success`, `#done`, `#bug`, `#testflight`), build versions (`v2.5.17 build 668`), issue remarks, category/environment inference, malformed input rejection, and private user guarding.
- **Quick Menu**: Persistent keyboard buttons, command handlers (`/start`, `/menu`, `/today`, `/week`, `/kpi`, `/help`), and ensuring button taps are never parsed as tasks.
- **Formatters & reports**: Standup copy text, CheckinMe weekly meeting slide format, daily task list report ("List all task today") with Telegram 4000-character line chunking, Markdown escaping.
- **Security & auth**: initData HMAC-SHA256 signature validation (valid, tampered, expired > 24 h, wrong token, foreign user ID → 403), webhook secret token verification, cron bearer secret.
- **Database lifecycle**: Task CRUD, status toggling with `completed_at` rules, GCIN & monthly narrative upserts, cross-user isolation.

Full quality gate: `npm run lint && npm run typecheck && npm test && npm run build`.

## Security model

- **Sessionless** (FR-AUTH-03): no cookies, no login screen. Every request carries the raw initData in `Authorization`.
- **FR-AUTH-01**: HMAC-SHA256 with the key derived from `BOT_TOKEN` (`HMAC("WebAppData", token)`), constant-time comparison, `auth_date` must be < 24 h old.
- **FR-AUTH-02**: any other Telegram user ID → 403. Every query is additionally scoped by `telegram_user_id`.
- `/api/bot` verifies `X-Telegram-Bot-Api-Secret-Token`; cron routes verify `Authorization: Bearer CRON_SECRET` (both constant-time).
- Secrets are read only on the server; the production client bundle contains no token and no mock-auth code.
- All SQL goes through Drizzle (parameterised). All input is validated with Zod at the API boundary.

## Project layout

```
app/                 routes: /daily /weekly /monthly + app/api/** (tasks, weekly, monthly, bot, cron)
components/          TaskCard, StatusToggle, KpiCard, GcinCard, PeriodNav, CopyButton, TabBar (responsive), …
lib/auth/            initData validation, withAuth(), webhook/cron secrets
lib/db/              client, tasks / reviews queries, weekly + monthly views
lib/kpi/             config.ts (ALL targets/thresholds) + engine.ts
lib/formatters/      Markdown escaping, daily standup, weekly slide
lib/telegram/        bot, parser, digest, daily-report, menu, kpi-summary
lib/client/          Telegram SDK wrapper, API client, clipboard, draft storage, autosave
lib/week-utils.ts    Monday–Sunday / month / time-zone helpers (pure)
db/                  schema.ts, migrations/, seed.ts
scripts/             migrate.ts, setup-bot.ts
tests/               Vitest unit + integration tests (11 test suites)
```

## Assumptions

Where the SRS was silent or ambiguous the simplest option satisfying it was chosen:

1. **Two SRS files** were found in `~/Downloads`; `software_requirements_specification_srs.txt` (the one named in the brief) was used.
2. **Week label**: shown as the ISO-8601 week number plus the full Monday–Sunday range (e.g. “Week 45 (Nov 2 - Nov 8)”). The SRS example (“Week 41 (Oct 26 - Oct 31)”) is inconsistent with a Monday–Sunday window, so the window rule won.
3. **What counts toward KPIs**: only tasks with status **Done or Success**, tallied by the task's own `month_year` (derived from `scheduled_date`). A task is therefore counted in exactly one month and is never re-counted in the next, even if it is completed later (FR-MO-02).
4. **Weekly production-error KPI**: target × the number of Mondays in the month (4 or 5). October 2026 → Good 4 / Excellence 12 (the SRS's “~12/mo”); November 2026 → 5 / 15. All thresholds live in `lib/kpi/config.ts`.
5. **Deadline audit**: “Overdeadline” = tasks flagged `is_over_deadline` (any status); “Complete on time” = Done/Success tasks that were never flagged. Open, unflagged tasks are not audited yet. The flag is set manually in the task editor (the SRS defines no automatic deadline).
6. **Weekly sections**: *Plan in This Week* = Feedback tasks in the window plus still-open (Feedback) tasks scheduled before it, with no age limit. History is not snapshotted, so viewing an old week shows today's open state for carry-overs. *Tracking Owner Confirm Task* = TestFlight-environment tasks plus completed milestone-feature tasks. *Issue Found Register* = tasks with a non-blank issue remark.
7. **Carry-over** means the task stays on its original date and surfaces in the weekly plan and the 08:30 digest; it is not duplicated onto later days.
8. **Status toggle** cycles Feedback → Done → Success → Feedback (tap, or swipe left past ~72 px). `completed_at` is kept when moving Done ↔ Success.
9. **API additions**: `POST /api/tasks` also accepts optional `scheduledDate` (default: today in Asia/Phnom_Penh, so the Daily tab can add to the viewed day) and `isOverDeadline`; `PATCH` also accepts `title`, `category`, `environment`, `buildVersion` so a task can be fully edited. No delete endpoint (not in the SRS). Validation errors are `422`; tasks of other users are `404`.
10. **Telegram Markdown**: exports use Telegram's legacy `Markdown` syntax (`*bold*`, `_italic_`) and escape `_ * ` [` in user text. The **CheckinMe Weekly Meeting** slide template was not provided, so the export uses its four named sections followed by the GCIN block, headed with the week, date range and owner (`REPORT_OWNER` in `lib/constants.ts`).
11. **initData lifetime**: 24 hours (`INIT_DATA_MAX_AGE_SECONDS`).
12. **Bot** is private: other users get a one-line refusal and nothing is stored. Category/environment defaults for chat capture are documented above.
13. **Autosave**: GCIN and monthly narratives save 0.8 s after the last keystroke (and when the app is hidden). A not-yet-confirmed draft is kept in `localStorage` and wins over the server copy after a restart; the quick-add form and per-task issue remarks are cached the same way (NFR-04).
14. **Database driver**: `postgres` (postgres.js) with prepared statements disabled, which works with Neon's pooled URL and Supabase's transaction pooler.
15. **Time zone** is fixed to Asia/Phnom_Penh (single-user app); changing `APP_TIMEZONE` and the UTC cron expressions together moves it.
