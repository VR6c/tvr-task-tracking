'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/ui/Field';
import type { ApiErrorBody } from '@/types/api';

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string | number>) => void;
  }
}

const WIDGET_SRC = 'https://telegram.org/js/telegram-widget.js?22';

/**
 * Web admin login. Both methods end with the same JWT session cookie:
 *   username + password -> POST /api/auth/login     (admins in the admin_users table)
 *   Telegram widget     -> POST /api/auth/telegram  (the ALLOWED_TELEGRAM_USER_ID account)
 */
export function LoginScreen({ botUsername, next }: { botUsername: string | null; next: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
        throw new Error(data?.error ?? 'Login failed. Please try again.');
      }
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setBusy(false);
    }
  };
  const signInRef = useRef(signIn);
  useEffect(() => {
    signInRef.current = signIn;
  });

  useEffect(() => {
    const host = container.current;
    if (!botUsername || !host) return;

    window.onTelegramAuth = (user) => void signInRef.current('/api/auth/telegram', user);
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
  }, [botUsername]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void signIn('/api/auth/login', { username, password });
  };

  return (
    <>
      <ScreenHeader title="Sign in" subtitle="Web admin for TVR Task Tracking" />
      <div className="max-w-md space-y-5 rounded-lg border border-separator bg-surface p-5">
        <form onSubmit={submit} className="space-y-3">
          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-lg bg-accent px-4 font-semibold text-accent-fg disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {botUsername && (
          <div className="space-y-3 border-t border-separator pt-4">
            <p className="text-sm text-hint">Or use the Telegram account allowed to use this app.</p>
            <div ref={container} className="min-h-12" />
          </div>
        )}
        <p className="text-xs text-hint">You stay signed in on this browser for 7 days.</p>
      </div>
    </>
  );
}
