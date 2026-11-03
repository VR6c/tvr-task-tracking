import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PeriodNavProps {
  label: ReactNode;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}

const arrow =
  'grid size-11 shrink-0 place-items-center rounded-lg bg-surface text-fg disabled:opacity-40 active:opacity-70';

/** Prev / label / next control shared by the date, week and month selectors. */
export function PeriodNav({ label, prevLabel, nextLabel, onPrev, onNext, nextDisabled }: PeriodNavProps) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={prevLabel} onClick={onPrev} className={arrow}>
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      <div className="min-w-0 flex-1 text-center text-[15px] font-semibold">{label}</div>
      <button type="button" aria-label={nextLabel} onClick={onNext} disabled={nextDisabled} className={arrow}>
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </div>
  );
}
