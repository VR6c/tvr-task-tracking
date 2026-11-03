/** Escapes the characters that break Telegram's legacy "Markdown" parse mode: _ * ` [ */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`[])/g, '\\$1');
}

/** Collapses newlines so user text can never break out of a list line. */
export function inline(text: string): string {
  return escapeMarkdown(text.replace(/\s+/g, ' ').trim());
}
