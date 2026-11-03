import type { ReactNode } from 'react';

interface SectionProps {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Section({ id, title, action, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id={id} className="text-base font-bold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
      <span className="min-w-0 break-words text-danger">{message}</span>
      <button type="button" onClick={onRetry} className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-accent">
        Retry
      </button>
    </div>
  );
}
