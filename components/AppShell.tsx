'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BarChart3, CalendarDays, ClipboardCheck, ListChecks, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PAGE_GUTTER, PAGE_WIDTH } from '@/lib/layout';

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/daily', label: 'Daily', icon: ListChecks },
  { href: '/weekly', label: 'Weekly', icon: CalendarDays },
  { href: '/monthly', label: 'Monthly', icon: BarChart3 },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
];

/**
 * Full-viewport app frame. Below `lg` (phones, small Telegram windows) navigation is a bottom tab bar;
 * from `lg` up it becomes a sticky top bar and the page uses the full window width.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return (
      <main className={cn('mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center pb-10', 'px-4')}>{children}</main>
    );
  }

  return (
    <div className="min-h-dvh">
      <nav
        aria-label="Primary"
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-separator bg-bg/95 pb-[var(--safe-bottom)] backdrop-blur',
          'lg:sticky lg:inset-x-auto lg:top-0 lg:border-b lg:border-t-0 lg:pb-0',
        )}
      >
        <div className={cn('mx-auto flex items-center lg:h-16 lg:gap-8', 'max-w-[480px] md:max-w-3xl lg:max-w-[84rem] lg:px-10')}>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-fg">
              <ClipboardCheck aria-hidden className="size-5" />
            </span>
            <p className="text-[15px] font-bold">TVR Tasks</p>
          </div>
          <ul className="flex h-14 flex-1 lg:h-full lg:flex-none lg:items-center lg:gap-1">
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href} className="flex-1 lg:flex-none">
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                      'lg:h-10 lg:flex-row lg:gap-2 lg:rounded-xl lg:px-4 lg:text-sm',
                      active ? 'text-accent lg:bg-accent/10' : 'text-hint lg:hover:bg-surface lg:hover:text-fg',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-b-full bg-accent transition-opacity lg:hidden',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Icon aria-hidden className="size-5 lg:size-4" strokeWidth={active ? 2.4 : 2} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      <main
        className={cn(
          'mx-auto w-full pb-[calc(9.5rem+var(--safe-bottom))] lg:pb-16',
          PAGE_WIDTH,
          PAGE_GUTTER,
        )}
      >
        {children}
      </main>
    </div>
  );
}
