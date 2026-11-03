import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div role="status" className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-surface text-hint">
        <Icon aria-hidden className="size-6" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-[16rem] text-sm text-hint">{description}</p>
    </div>
  );
}
