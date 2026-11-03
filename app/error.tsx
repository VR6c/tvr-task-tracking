'use client';

import { ErrorState } from '@/components/ui/ErrorState';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState message={error.message || 'Unexpected error.'} onRetry={reset} />;
}
