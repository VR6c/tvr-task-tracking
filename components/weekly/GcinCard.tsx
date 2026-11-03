import { useId } from 'react';
import { cn } from '@/lib/cn';

export type GcinAccent = 'ok' | 'warn' | 'info' | 'purple';

const ACCENT: Record<GcinAccent, { border: string; text: string }> = {
  ok: { border: 'border-l-ok', text: 'text-ok' },
  warn: { border: 'border-l-warn', text: 'text-warn' },
  info: { border: 'border-l-info', text: 'text-info' },
  purple: { border: 'border-l-purple', text: 'text-purple' },
};

interface GcinCardProps {
  letter: string;
  title: string;
  hint: string;
  accent: GcinAccent;
  value: string;
  onChange: (value: string) => void;
}

export function GcinCard({ letter, title, hint, accent, value, onChange }: GcinCardProps) {
  const id = useId();
  const style = ACCENT[accent];
  return (
    <div className={cn('rounded-lg border border-separator border-l-4 bg-surface p-3', style.border)}>
      <label htmlFor={id} className="flex items-baseline gap-2">
        <span className={cn('text-lg font-bold', style.text)}>{letter}</span>
        <span className="text-sm font-semibold">{title}</span>
      </label>
      <p className="mb-2 text-xs text-hint">{hint}</p>
      <textarea
        id={id}
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write a few lines…"
        className="min-h-24 w-full resize-y rounded-lg border border-separator bg-bg p-2.5 text-[15px] placeholder:text-hint/70"
      />
    </div>
  );
}
