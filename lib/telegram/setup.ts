import type { Api } from 'grammy';

export const BOT_COMMANDS = [
  { command: 'start', description: 'Open TVR Task Tracking' },
  { command: 'menu', description: 'Show the quick menu buttons' },
  { command: 'today', description: "List today's tasks" },
  { command: 'week', description: 'This week in slide format' },
  { command: 'kpi', description: 'Monthly KPI snapshot' },
  { command: 'help', description: 'How to log a task by message' },
];

export function webhookUrl(appUrl: string): string {
  return `${appUrl.replace(/\/$/, '')}/api/bot`;
}

interface SyncOptions {
  appUrl: string;
  secret: string;
  /** Discard updates queued while the webhook was down. */
  dropPendingUpdates: boolean;
}

/** Registers the webhook (with secret token), the Mini App menu button and the command list. */
export async function syncBot(api: Api, { appUrl, secret, dropPendingUpdates }: SyncOptions): Promise<void> {
  const base = appUrl.replace(/\/$/, '');
  await api.setWebhook(webhookUrl(base), {
    secret_token: secret,
    allowed_updates: ['message'],
    drop_pending_updates: dropPendingUpdates,
  });
  await api.setChatMenuButton({
    menu_button: { type: 'web_app', text: 'Tasks', web_app: { url: `${base}/daily` } },
  });
  await api.setMyCommands(BOT_COMMANDS);
}
