'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { InlineError, Section } from '@/components/admin/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/client/api-client';
import { haptic } from '@/lib/client/telegram';
import { useResource } from '@/lib/client/use-resource';
import { cn } from '@/lib/cn';
import type { AdminBotResponse } from '@/types/api';

export function BotSection() {
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  const bot = useResource<AdminBotResponse>('admin:bot', (signal) =>
    apiFetch<AdminBotResponse>('/api/admin/bot', { signal }),
  );
  const data = bot.data;
  const webhookOk = !!data && data.webhook.url === data.webhook.expectedUrl && !data.webhook.lastError;

  const sync = async () => {
    setSyncing(true);
    try {
      bot.replace(await apiFetch<AdminBotResponse>('/api/admin/bot', { method: 'POST' }));
      haptic('success');
      toast.show('Bot registration updated');
    } catch (error) {
      haptic('error');
      toast.show(errorMessage(error), 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Section
      id="admin-bot"
      title="Bot"
      action={
        <button
          type="button"
          onClick={bot.reload}
          aria-label="Refresh bot status"
          className="grid size-11 place-items-center rounded-lg text-hint"
        >
          <RefreshCw aria-hidden className={cn('size-4', bot.loading && 'animate-spin')} />
        </button>
      }
    >
      {bot.error ? (
        <InlineError message={bot.error} onRetry={bot.reload} />
      ) : !data ? (
        <Skeleton className="h-32" />
      ) : (
        <div className="space-y-3 rounded-lg border border-separator bg-surface p-3 text-sm">
          <dl className="space-y-2">
            <Row label="Bot" value={data.username ? `@${data.username}` : 'Unknown'} />
            <Row
              label="Webhook"
              value={webhookOk ? 'Healthy' : data.webhook.url ? 'Needs attention' : 'Not registered'}
              tone={webhookOk ? 'ok' : 'danger'}
            />
            <Row label="Pending updates" value={String(data.webhook.pendingUpdates)} />
            <Row label="Registered URL" value={data.webhook.url || 'none'} mono />
            {data.webhook.url !== data.webhook.expectedUrl && <Row label="Expected URL" value={data.webhook.expectedUrl} mono />}
            {data.webhook.lastError && (
              <Row
                label="Last error"
                value={`${data.webhook.lastError}${data.webhook.lastErrorAt ? ` (${new Date(data.webhook.lastErrorAt).toLocaleString()})` : ''}`}
                tone="danger"
              />
            )}
          </dl>
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {syncing ? 'Re-registering...' : 'Re-register webhook, menu & commands'}
          </button>
        </div>
      )}
    </Section>
  );
}

function Row({ label, value, tone, mono }: { label: string; value: string; tone?: 'ok' | 'danger'; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-hint">{label}</dt>
      <dd className={cn('min-w-0 break-all font-medium sm:text-right', mono && 'font-mono text-xs', tone === 'ok' && 'text-ok', tone === 'danger' && 'text-danger')}>
        {value}
      </dd>
    </div>
  );
}
