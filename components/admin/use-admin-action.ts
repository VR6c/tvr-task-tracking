'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/client/api-client';
import { haptic } from '@/lib/client/telegram';

/**
 * Runs an admin mutation with haptic + toast feedback. `pending` holds the id of the run in flight
 * (or null), so a list can disable its buttons and label the active one.
 */
export function useAdminAction() {
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async (id: string, job: () => Promise<void>, successMessage: string): Promise<boolean> => {
      setPending(id);
      try {
        await job();
        haptic('success');
        toast.show(successMessage);
        return true;
      } catch (error) {
        haptic('error');
        toast.show(errorMessage(error), 'error');
        return false;
      } finally {
        setPending(null);
      }
    },
    [toast],
  );

  return { pending, run };
}
