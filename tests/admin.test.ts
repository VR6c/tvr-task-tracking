import type { Api } from 'grammy';
import { describe, expect, it, vi } from 'vitest';
import { JOB_KEYS, JOB_LABELS, isJobKey } from '@/lib/telegram/jobs';
import { BOT_COMMANDS, syncBot, webhookUrl } from '@/lib/telegram/setup';

describe('admin jobs', () => {
  it('has a label for every job key and recognises only those keys', () => {
    for (const key of JOB_KEYS) {
      expect(isJobKey(key)).toBe(true);
      expect(JOB_LABELS[key].label).toBeTruthy();
    }
    expect(isJobKey('nope')).toBe(false);
    expect(isJobKey('constructor')).toBe(false);
  });
});

describe('bot setup', () => {
  it('builds the webhook URL without doubling slashes', () => {
    expect(webhookUrl('https://app.example.com/')).toBe('https://app.example.com/api/bot');
    expect(webhookUrl('https://app.example.com')).toBe('https://app.example.com/api/bot');
  });

  it('registers webhook, menu button and commands', async () => {
    const api = {
      setWebhook: vi.fn().mockResolvedValue(true),
      setChatMenuButton: vi.fn().mockResolvedValue(true),
      setMyCommands: vi.fn().mockResolvedValue(true),
    };
    await syncBot(api as unknown as Api, { appUrl: 'https://app.example.com/', secret: 's3cret', dropPendingUpdates: false });

    expect(api.setWebhook).toHaveBeenCalledWith('https://app.example.com/api/bot', {
      secret_token: 's3cret',
      allowed_updates: ['message'],
      drop_pending_updates: false,
    });
    expect(api.setChatMenuButton).toHaveBeenCalledWith({
      menu_button: { type: 'web_app', text: 'Tasks', web_app: { url: 'https://app.example.com/daily' } },
    });
    expect(api.setMyCommands).toHaveBeenCalledWith(BOT_COMMANDS);
  });
});
