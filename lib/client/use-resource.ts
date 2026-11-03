'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { errorMessage } from '@/lib/client/api-client';

export interface Resource<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  reload: () => void;
  /** Update cached data in place (optimistic updates and targeted rollbacks). */
  mutate: (updater: (current: T) => T) => void;
  replace: (value: T) => void;
}

interface Settled<T> {
  token: string;
  data?: T;
  error?: string;
}

/** Loads `fetcher` whenever `key` changes. Loading/error are derived, so no state is set during render or in effects. */
export function useResource<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>): Resource<T> {
  const [settled, setSettled] = useState<Settled<T>>();
  const [attempt, setAttempt] = useState(0);
  const run = useEffectEvent(fetcher);
  const token = key === null ? null : `${key}#${attempt}`;

  useEffect(() => {
    if (token === null) return;
    const controller = new AbortController();
    run(controller.signal).then(
      (data) => !controller.signal.aborted && setSettled({ token, data }),
      (error: unknown) => !controller.signal.aborted && setSettled({ token, error: errorMessage(error) }),
    );
    return () => controller.abort();
  }, [token]);

  const current = settled && settled.token === token ? settled : undefined;

  const mutate = useCallback((updater: (value: T) => T): void => {
    setSettled((state) => (state && state.data !== undefined ? { ...state, data: updater(state.data) } : state));
  }, []);

  const replace = useCallback((value: T) => setSettled((state) => (state ? { ...state, data: value } : state)), []);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data: current?.data,
    error: current?.error,
    loading: token !== null && !current,
    reload,
    mutate,
    replace,
  };
}
