import { cn } from '@/lib/cn';

interface ChipGroupProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Single-select pill group (radio semantics) with 44px touch targets. */
export function ChipGroup<T extends string>({ label, options, value, onChange }: ChipGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors',
              selected ? 'border-accent bg-accent text-accent-fg' : 'border-separator bg-bg text-fg',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
