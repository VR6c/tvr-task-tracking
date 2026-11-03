'use client';

import { useSyncExternalStore } from 'react';
import { todayInTimezone } from '@/lib/week-utils';

const subscribe = (): (() => void) => () => undefined;

/** Today's date in Asia/Phnom_Penh; null during SSR/hydration so server and client markup match. */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, () => todayInTimezone(), () => null);
}
