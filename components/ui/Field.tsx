import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-lg border border-separator bg-bg px-3 text-[15px] placeholder:text-hint/70 focus-visible:border-accent';

export function TextField({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-hint">
        {label}
      </label>
      <input id={id} {...props} className={cn(control, 'min-h-11', className)} />
    </div>
  );
}

export function TextArea({ label, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-hint">
        {label}
      </label>
      <textarea id={id} {...props} className={cn(control, 'min-h-20 py-2.5', className)} />
    </div>
  );
}

export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-hint">{label}</span>
      {children}
    </div>
  );
}
