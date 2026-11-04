'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarDays, ListChecks, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PAGE_GUTTER, PAGE_WIDTH } from '@/lib/layout';

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/daily', label: 'Daily', icon: ListChecks },
  { href: '/weekly', label: 'Weekly', icon: CalendarDays },
  { href: '/monthly', label: 'Monthly', icon: BarChart3 },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
];

/** Bottom tab bar on phones; becomes a sticky top bar from the tablet breakpoint up. */
export function TabBar() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-separator bg-bg pb-[env(safe-area-inset-bottom)]',
        'md:sticky md:top-0 md:bottom-auto md:border-b md:border-t-0 md:pb-0',
      )}
    >
      <div className={cn('mx-auto flex h-14 items-center md:gap-6', PAGE_WIDTH, PAGE_GUTTER)}>
        <span className="hidden text-[15px] font-bold md:block">TVR Task Tracking</span>
        <ul className="flex h-full flex-1 md:flex-none md:items-center md:gap-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href} className="flex-1 md:flex-none">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                    'md:h-11 md:flex-row md:gap-2 md:rounded-md md:px-4 md:text-sm',
                    active ? 'text-accent md:bg-accent/10' : 'text-hint md:hover:bg-surface',
                  )}
                >
                  <Icon aria-hidden className="size-5 md:size-4" strokeWidth={active ? 2.4 : 2} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
