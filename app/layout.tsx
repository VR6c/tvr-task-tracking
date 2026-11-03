import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/Providers';
import { TabBar } from '@/components/TabBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'TVR Task Tracking',
  description: 'Daily QA task log, weekly GCIN retrospective and monthly KPIs inside Telegram.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main className="mx-auto min-h-dvh w-full max-w-[480px] px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))]">
            {children}
          </main>
          <TabBar />
        </Providers>
      </body>
    </html>
  );
}
