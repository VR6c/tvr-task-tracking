import type { ReactNode } from 'react';

/**
 * Below `lg`: a fixed full-width bar above the tab bar.
 * Desktop: floats at the bottom-right of the page flow so it stays reachable without covering content.
 */
export function StickyAction({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+var(--safe-bottom))] z-20 lg:pointer-events-auto lg:sticky lg:inset-x-auto lg:bottom-6 lg:mt-8">
      <div className="mx-auto max-w-[480px] px-4 pb-2 pt-3 md:max-w-3xl md:px-6 lg:ml-auto lg:mr-0 lg:max-w-xs lg:p-0">
        <div className="pointer-events-auto rounded-xl bg-surface/95 lg:shadow-lg">{children}</div>
      </div>
    </div>
  );
}
