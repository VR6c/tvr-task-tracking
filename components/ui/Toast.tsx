'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';

type Tone = 'success' | 'error';
interface ToastState {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastApi {
  show: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export const useToast = (): ToastApi => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: Tone = 'success') => {
    counter.current += 1;
    setToast({ id: counter.current, message, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  const Icon = toast?.tone === 'error' ? CircleAlert : CheckCircle2;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] md:bottom-8 z-50 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className="flex max-w-[22rem] items-center gap-2 rounded-md bg-fg px-3.5 py-2.5 text-sm font-medium text-bg"
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
