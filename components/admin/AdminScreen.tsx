'use client';

import { useSyncExternalStore } from 'react';
import { LogOut } from 'lucide-react';
import { BotSection } from '@/components/admin/BotSection';
import { JobsSection } from '@/components/admin/JobsSection';
import { StatsSection } from '@/components/admin/StatsSection';
import { TasksSection } from '@/components/admin/TasksSection';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getRawInitData } from '@/lib/client/telegram';

const noSubscribe = () => () => {};

/** Logout only makes sense for the browser session; inside Telegram, initData is the credential. */
function LogoutButton() {
  const inBrowser = useSyncExternalStore(noSubscribe, () => !getRawInitData(), () => false);
  if (!inBrowser) return null;

  const logout = async () => {
    await fetch('/api/auth/telegram', { method: 'DELETE' }).catch(() => undefined);
    // Full reload so no data fetched with the old cookie stays in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload resets auth state
    window.location.href = '/login';
  };
  return (
    <button
      type="button"
      onClick={logout}
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-accent"
    >
      <LogOut aria-hidden className="size-4" />
      Log out
    </button>
  );
}

export function AdminScreen() {
  return (
    <>
      <ScreenHeader title="Admin" subtitle="Bot, scheduled messages and data" trailing={<LogoutButton />} />
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-8">
          <StatsSection />
          <BotSection />
          <JobsSection />
        </div>
        <TasksSection />
      </div>
    </>
  );
}
