import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-hint/20', className)} />;
}

export function SkeletonList({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[4.5rem]" />
      ))}
    </div>
  );
}
