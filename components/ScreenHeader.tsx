import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  children?: ReactNode;
}

export function ScreenHeader({ title, subtitle, trailing, children }: ScreenHeaderProps) {
  return (
    <header className="space-y-3 pb-3 pt-[max(1rem,env(safe-area-inset-top),var(--tg-viewport-content-safe-area-inset-top,0px))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-hint">{subtitle}</p>}
        </div>
        {trailing}
      </div>
      {children}
    </header>
  );
}
