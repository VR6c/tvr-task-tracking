import type { ReactNode } from 'react';

/** Pins a primary action just above the tab bar (and the device safe area). */
export function StickyAction({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20">
      <div className="pointer-events-auto mx-auto max-w-[480px] bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-2 pt-3">
        {children}
      </div>
    </div>
  );
}
