'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/client/api-client';
import { readDraft, writeDraft } from '@/lib/client/draft-storage';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface Options<T> {
  /** Unique per document (e.g. `gcin:2026-11-02`). Mount the consumer with `key={storageKey}`. */
  storageKey: string;
  server: T;
  save: (value: T) => Promise<void>;
  delayMs?: number;
}

/**
 * Debounced autosave with a localStorage safety net (NFR-04): every keystroke is mirrored to storage as a
 * dirty draft; after a restart a dirty draft wins over the server copy and is re-sent.
 */
export function useAutosaveDoc<T extends object>({ storageKey, server, save, delayMs = 800 }: Options<T>) {
  const [initial] = useState(() => {
    const draft = readDraft<T>(storageKey);
    return draft?.dirty ? { value: draft.value, restored: true } : { value: server, restored: false };
  });
  const [value, setValue] = useState<T>(initial.value);
  const [status, setStatus] = useState<SaveStatus>(initial.restored ? 'dirty' : 'idle');
  const [lastError, setLastError] = useState<string>();

  const latest = useRef(value);
  const dirty = useRef(initial.restored);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inFlight = useRef(false);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  /** Sends the latest value; loops while edits keep arriving mid-flight so the last write always wins. */
  const flush = useCallback(async (): Promise<void> => {
    clearTimeout(timer.current);
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      while (dirty.current) {
        const sent = latest.current;
        setStatus('saving');
        await saveRef.current(sent);
        if (latest.current === sent) {
          dirty.current = false;
          writeDraft(storageKey, { value: sent, dirty: false });
          setStatus('saved');
        }
      }
    } catch (error) {
      setLastError(errorMessage(error));
      setStatus('error');
    } finally {
      inFlight.current = false;
    }
  }, [storageKey]);

  const update = useCallback(
    (next: T) => {
      latest.current = next;
      dirty.current = true;
      setValue(next);
      setStatus('dirty');
      writeDraft(storageKey, { value: next, dirty: true });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delayMs);
    },
    [delayMs, flush, storageKey],
  );

  // Re-send a draft restored after a restart, and flush pending edits when the app is hidden or closed.
  useEffect(() => {
    const restore = initial.restored ? setTimeout(() => void flush(), 0) : undefined;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    const pending = timer;
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      clearTimeout(restore);
      clearTimeout(pending.current);
      void flush();
    };
  }, [flush, initial.restored]);

  return { value, update, status, error: lastError, retry: () => void flush() };
}
