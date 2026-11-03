import { RefreshCw, TriangleAlert } from 'lucide-react';

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
        <TriangleAlert aria-hidden className="size-6" />
      </span>
      <h3 className="text-base font-semibold">Couldn&apos;t load this screen</h3>
      <p className="mt-1 max-w-[18rem] text-sm text-hint">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg"
      >
        <RefreshCw aria-hidden className="size-4" />
        Try again
      </button>
    </div>
  );
}
