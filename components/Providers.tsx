'use client';

import { useEffect, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { initTelegram } from '@/lib/client/telegram';

/** Boots the Telegram SDK after mount (NFR-01) and provides toasts. Renders children immediately - no hydration gate. */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initTelegram();
  }, []);
  return <ToastProvider>{children}</ToastProvider>;
}
