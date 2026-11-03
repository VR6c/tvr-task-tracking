import {
  hapticFeedback,
  init,
  miniApp,
  retrieveRawInitData,
  themeParams,
  viewport,
} from '@telegram-apps/sdk-react';

/**
 * Every Telegram SDK call lives here and is guarded for SSR (NFR-01). Nothing throws outside Telegram:
 * in a plain browser each helper degrades to a no-op so the app still renders for development.
 */

const isBrowser = (): boolean => typeof window !== 'undefined';

function attempt(fn: () => unknown): void {
  try {
    fn();
  } catch {
    /* the SDK throws when a feature is unsupported by the host Telegram client */
  }
}

function applyColorScheme(): void {
  attempt(() => {
    document.documentElement.dataset.theme = themeParams.isDark() ? 'dark' : 'light';
  });
}

let initialised = false;

/** Initialises the SDK once: theme CSS variables, expanded viewport, safe-area variables. */
export function initTelegram(): void {
  if (!isBrowser() || initialised) return;
  initialised = true;

  attempt(() => init());
  // Reading the launch params once makes the SDK persist them, so initData survives in-app navigation.
  getRawInitData();
  attempt(() => {
    if (themeParams.mountSync.isAvailable()) themeParams.mountSync();
    if (themeParams.bindCssVars.isAvailable()) themeParams.bindCssVars();
    applyColorScheme();
    themeParams.isDark.sub(applyColorScheme);
  });
  attempt(() => {
    if (miniApp.mountSync.isAvailable()) miniApp.mountSync();
    if (miniApp.ready.isAvailable()) miniApp.ready();
  });
  attempt(() => {
    if (!viewport.mount.isAvailable()) return;
    void viewport
      .mount()
      .then(() => {
        attempt(() => viewport.bindCssVars());
        attempt(() => {
          if (viewport.expand.isAvailable()) viewport.expand();
        });
      })
      .catch(() => undefined);
  });
}

const INIT_DATA_STORAGE_KEY = 'tvr:init-data';

function initDataFromHash(hash: string | undefined): string | undefined {
  if (!hash) return undefined;
  const fragment = hash.includes('#') ? hash.slice(hash.indexOf('#') + 1) : hash.replace(/^#/, '');
  return new URLSearchParams(fragment).get('tgWebAppData') || undefined;
}

function readStored(): string | undefined {
  try {
    return window.sessionStorage.getItem(INIT_DATA_STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Raw initData string for the Authorization header, or undefined outside Telegram.
 * The server validates the signature itself, so this only needs the raw string: the SDK is tried first,
 * then the launch URL, then a sessionStorage copy (the URL fragment is lost after in-app navigation).
 */
export function getRawInitData(): string | undefined {
  if (!isBrowser()) return undefined;
  let raw: string | undefined;
  try {
    raw = retrieveRawInitData() || undefined;
  } catch {
    raw = undefined;
  }
  raw ??= initDataFromHash(window.location.hash);
  raw ??= initDataFromHash(performance.getEntriesByType('navigation')[0]?.name);
  if (raw) {
    try {
      window.sessionStorage.setItem(INIT_DATA_STORAGE_KEY, raw);
    } catch {
      /* storage unavailable - fine, the URL/SDK sources still work for the first load */
    }
    return raw;
  }
  return readStored();
}

export type HapticKind = 'select' | 'light' | 'success' | 'error';

export function haptic(kind: HapticKind): void {
  if (!isBrowser()) return;
  attempt(() => {
    if (!hapticFeedback.isSupported()) return;
    if (kind === 'select') hapticFeedback.selectionChanged();
    else if (kind === 'light') hapticFeedback.impactOccurred('light');
    else hapticFeedback.notificationOccurred(kind);
  });
}
