import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  children?: ReactNode;
}

/**
 * Phones: title + trailing on one row, controls (`children`) underneath.
 * Desktop: one row - title on the left, controls then trailing on the right.
 */
export function ScreenHeader({ title, subtitle, trailing, children }: ScreenHeaderProps) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 pb-4 pt-[calc(var(--header-top)+1rem)] lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-x-4 lg:pb-6 lg:pt-8">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold leading-tight tracking-tight lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-hint">{subtitle}</p>}
      </div>
      {trailing && <div className="lg:order-3">{trailing}</div>}
      {children && <div className="col-span-2 space-y-2 lg:order-2 lg:col-span-1">{children}</div>}
    </header>
  );
}
