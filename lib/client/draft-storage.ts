/** localStorage helpers for NFR-04. Storage can be blocked or full inside webviews, so every call is guarded. */

export interface Draft<T> {
  value: T;
  /** true while the draft has not yet been confirmed saved on the server. */
  dirty: boolean;
}

const PREFIX = 'tvr:draft:';

export function readDraft<T>(key: string): Draft<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft<T>> | null;
    return parsed && 'value' in parsed ? { value: parsed.value as T, dirty: parsed.dirty !== false } : null;
  } catch {
    return null;
  }
}

export function writeDraft<T>(key: string, draft: Draft<T>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(draft));
  } catch {
    /* quota or privacy mode - the in-memory value still works */
  }
}

export function clearDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
