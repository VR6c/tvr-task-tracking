import { cn } from '@/lib/cn';

interface ChipGroupProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** `chips` wrap freely (many options); `segmented` is one connected control (2-3 options). */
  variant?: 'chips' | 'segmented';
}

/** Single-select group with radio semantics and 44px touch targets. */
export function ChipGroup<T extends string>({ label, options, value, onChange, variant = 'chips' }: ChipGroupProps<T>) {
  const segmented = variant === 'segmented';
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(segmented ? 'flex overflow-hidden rounded-md border border-separator' : 'flex flex-wrap gap-2')}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-11 text-sm font-medium transition-colors',
              segmented
                ? cn('flex-1 px-2', index > 0 && 'border-l border-separator', selected ? 'bg-accent text-accent-fg' : 'bg-bg text-fg')
                : cn('rounded-md border px-3.5', selected ? 'border-accent bg-accent text-accent-fg' : 'border-separator bg-bg text-fg'),
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
