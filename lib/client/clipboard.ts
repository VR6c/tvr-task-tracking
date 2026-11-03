/** Copies text; falls back to a hidden textarea + execCommand for Telegram webviews without the async clipboard API. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* permission denied or unsupported - try the legacy path */
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  Object.assign(textarea.style, { position: 'fixed', top: '0', left: '-9999px', opacity: '0' });
  document.body.appendChild(textarea);
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  try {
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
    active?.focus();
  }
}
