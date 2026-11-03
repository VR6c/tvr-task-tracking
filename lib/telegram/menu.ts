import { Keyboard } from 'grammy';

/** Button labels double as the text Telegram sends back when a button is tapped, so handlers match on them. */
export const MENU = {
  openApp: 'Open App',
  today: "Today's Tasks",
  week: 'This Week',
  kpi: 'Monthly KPIs',
} as const;

export const MENU_PLACEHOLDER = 'Log a task, e.g. Quick Test v2.5.17 build 668 #success';

/**
 * The persistent Quick Menu: a reply keyboard pinned under the chat input.
 * "Open App" is a WebApp button (launches the Mini App); the others send their label as a message.
 */
export function buildQuickMenu(appUrl: string): Keyboard {
  return new Keyboard()
    .webApp(MENU.openApp, appUrl)
    .row()
    .text(MENU.today)
    .text(MENU.week)
    .text(MENU.kpi)
    .persistent()
    .resized()
    .placeholder(MENU_PLACEHOLDER);
}
