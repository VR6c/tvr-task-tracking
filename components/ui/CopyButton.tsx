'use client';

import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { copyText } from '@/lib/client/clipboard';
import { haptic } from '@/lib/client/telegram';
import { cn } from '@/lib/cn';

interface CopyButtonProps {
  label: string;
  /** Called at tap time so the copied text always reflects the latest state. */
  getText: () => string;
  successMessage: string;
  disabled?: boolean;
}

/** Sticky full-width copy action with a manual-copy dialog for webviews where both clipboard paths fail. */
export function CopyButton({ label, getText, successMessage, disabled }: CopyButtonProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function handleCopy() {
    const text = getText();
    if (await copyText(text)) {
      haptic('success');
      toast.show(successMessage);
      setCopied(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } else {
      haptic('error');
      setManualText(text);
    }
  }

  const Icon = copied ? Check : Copy;
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => void handleCopy()}
        className={cn(
          'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold shadow-sm transition-opacity',
          'bg-accent text-accent-fg disabled:opacity-50',
        )}
      >
        <Icon aria-hidden className="size-5" />
        {copied ? 'Copied' : label}
      </button>
      {manualText !== null && (
        <div role="dialog" aria-modal="true" aria-label="Copy manually" className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="mx-auto w-full max-w-[480px] rounded-t-2xl bg-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="mb-2 text-sm text-hint">Your device blocked automatic copy. Select the text below and copy it.</p>
            <textarea
              readOnly
              autoFocus
              aria-label="Report text"
              value={manualText}
              onFocus={(e) => e.currentTarget.select()}
              className="h-48 w-full rounded-lg border border-separator bg-surface p-3 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setManualText(null)}
              className="mt-3 min-h-11 w-full rounded-lg bg-surface text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
