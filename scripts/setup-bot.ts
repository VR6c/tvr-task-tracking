import './load-env';
import { Api } from 'grammy';

/**
 * Registers the webhook (with secret token) and the Mini App menu button.
 *   npm run bot:setup            register / update
 *   npm run bot:setup -- --delete   remove the webhook (e.g. to use polling locally)
 */
async function main(): Promise<void> {
  const token = process.env.BOT_TOKEN;
  const secret = process.env.WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (!token || !secret || !appUrl) throw new Error('BOT_TOKEN, WEBHOOK_SECRET and NEXT_PUBLIC_APP_URL must be set');

  const api = new Api(token);
  const me = await api.getMe();

  if (process.argv.includes('--delete')) {
    await api.deleteWebhook({ drop_pending_updates: true });
    console.log(`Webhook removed for @${me.username}.`);
    return;
  }

  if (!appUrl.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_APP_URL must be an https URL (use a tunnel such as ngrok or cloudflared locally).');
  }

  await api.setWebhook(`${appUrl}/api/bot`, {
    secret_token: secret,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });
  await api.setChatMenuButton({
    menu_button: { type: 'web_app', text: 'Tasks', web_app: { url: `${appUrl}/daily` } },
  });
  await api.setMyCommands([
    { command: 'start', description: 'Open TVR Task Tracking' },
    { command: 'help', description: 'How to log a task by message' },
  ]);

  const info = await api.getWebhookInfo();
  console.log(`@${me.username}: webhook -> ${info.url}`);
  console.log(`Menu button -> ${appUrl}/daily`);
  if (info.last_error_message) console.warn(`Telegram reported: ${info.last_error_message}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
