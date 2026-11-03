import type { ReactNode } from 'react';
import { PAGE_GUTTER, PAGE_WIDTH } from '@/lib/layout';

/**
 * Phones: a fixed full-width bar above the tab bar.
 * Tablet/desktop: part of the page flow (end of content, right-aligned) so it never covers what you are typing.
 */
export function StickyAction({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 md:pointer-events-auto md:static md:mt-8">
      <div className={`mx-auto ${PAGE_WIDTH} ${PAGE_GUTTER} pb-2 pt-3 md:flex md:justify-end md:p-0`}>
        <div className="pointer-events-auto rounded-lg bg-bg/95 md:w-80 md:bg-transparent">{children}</div>
      </div>
    </div>
  );
}
