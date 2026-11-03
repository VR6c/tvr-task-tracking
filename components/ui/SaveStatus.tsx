import type { SaveStatus as Status } from '@/lib/client/use-autosave-doc';

interface SaveStatusProps {
  status: Status;
  error?: string;
  onRetry: () => void;
}

const TEXT: Record<Exclude<Status, 'error'>, string> = {
  idle: 'Changes save automatically',
  dirty: 'Unsaved changes…',
  saving: 'Saving…',
  saved: 'Saved',
};

export function SaveStatus({ status, error, onRetry }: SaveStatusProps) {
  return (
    <p role="status" aria-live="polite" className="flex min-h-6 items-center gap-2 text-xs text-hint">
      {status === 'error' ? (
        <>
          <span className="text-danger">Couldn&apos;t save{error ? `: ${error}` : ''}</span>
          <button type="button" onClick={onRetry} className="min-h-11 px-2 font-semibold text-link">
            Retry
          </button>
        </>
      ) : (
        TEXT[status]
      )}
    </p>
  );
}
