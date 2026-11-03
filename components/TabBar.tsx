'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarDays, ListChecks, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/daily', label: 'Daily', icon: ListChecks },
  { href: '/weekly', label: 'Weekly', icon: CalendarDays },
  { href: '/monthly', label: 'Monthly', icon: BarChart3 },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-separator bg-bg pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-14 max-w-[480px]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                  active ? 'text-accent' : 'text-hint',
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
