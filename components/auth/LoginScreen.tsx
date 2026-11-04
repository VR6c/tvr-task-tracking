'use client';

import { useEffect, useRef, useState } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { ApiErrorBody } from '@/types/api';

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string | number>) => void;
  }
}

const WIDGET_SRC = 'https://telegram.org/js/telegram-widget.js?22';

/** Web admin login: Telegram Login Widget -> POST /api/auth/telegram -> session cookie. */
export function LoginScreen({ botUsername, next }: { botUsername: string | null; next: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const host = container.current;
    if (!botUsername || !host) return;

    window.onTelegramAuth = async (user) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
          throw new Error(body?.error ?? 'Login failed. Please try again.');
        }
        window.location.href = next;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
        setBusy(false);
      }
    };

    const script = document.createElement('script');
    script.src = WIDGET_SRC;
    script.async = true;
    script.dataset.telegramLogin = botUsername;
    script.dataset.size = 'large';
    script.dataset.radius = '8';
    script.dataset.onauth = 'onTelegramAuth(user)';
    script.dataset.requestAccess = 'write';
    host.replaceChildren(script);

    return () => {
      host.replaceChildren();
      delete window.onTelegramAuth;
    };
  }, [botUsername, next]);

  return (
    <>
      <ScreenHeader title="Sign in" subtitle="Web admin for TVR Task Tracking" />
      <div className="max-w-md space-y-4 rounded-lg border border-separator bg-surface p-5">
        <p className="text-sm text-hint">
          Log in with the Telegram account allowed to use this app. You stay signed in on this browser for 7 days.
        </p>
        {botUsername ? (
          <div ref={container} className="min-h-12" aria-busy={busy} />
        ) : (
          <p role="alert" className="text-sm text-danger">
            Could not reach the Telegram bot. Check BOT_TOKEN and reload.
          </p>
        )}
        {busy && <p className="text-sm text-hint">Signing in…</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
