import { CalendarClock, CheckCheck, CircleCheck, Clock, type LucideIcon } from 'lucide-react';
import type { TaskStatus } from '@/lib/constants';

/** Status is always conveyed by icon + text as well as colour. */
export const STATUS_STYLE: Record<TaskStatus, { icon: LucideIcon; text: string; soft: string; border: string }> = {
  Plan: { icon: CalendarClock, text: 'text-purple', soft: 'bg-purple/15', border: 'border-purple/40' },
  Feedback: { icon: Clock, text: 'text-warn', soft: 'bg-warn/15', border: 'border-warn/40' },
  Done: { icon: CircleCheck, text: 'text-info', soft: 'bg-info/15', border: 'border-info/40' },
  Success: { icon: CheckCheck, text: 'text-ok', soft: 'bg-ok/15', border: 'border-ok/40' },
};
