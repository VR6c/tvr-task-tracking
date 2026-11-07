import { STATUS_LABELS, nextStatus, type TaskStatus } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { STATUS_STYLE } from '@/components/daily/status-style';

interface StatusToggleProps {
  status: TaskStatus;
  onToggle: () => void;
  disabled?: boolean;
}

/** Visible 1-tap fallback for the swipe gesture: cycles Plan -> Feedback -> Done -> Success. */
export function StatusToggle({ status, onToggle, disabled }: StatusToggleProps) {
  const { icon: Icon, text, soft, border } = STATUS_STYLE[status];
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={`Status ${STATUS_LABELS[status]}. Tap to change to ${STATUS_LABELS[nextStatus(status)]}`}
      className={cn(
        'flex min-h-11 min-w-[5.75rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-60',
        text,
        soft,
        border,
      )}
    >
      <Icon aria-hidden className="size-4" />
      {STATUS_LABELS[status]}
    </button>
  );
}
