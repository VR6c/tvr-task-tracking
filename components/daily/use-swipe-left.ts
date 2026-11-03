'use client';

import { useRef, useState, type PointerEvent } from 'react';

const TRIGGER_PX = 72;
const MAX_PX = 104;
const LOCK_PX = 8;

/**
 * Left-swipe gesture via pointer events (touch + mouse). The element must use `touch-action: pan-y`
 * so vertical scrolling keeps working; the browser fires pointercancel when it takes over a scroll.
 */
export function useSwipeLeft(onTrigger: () => void, enabled = true) {
  const [offset, setOffset] = useState(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const locked = useRef<'x' | 'y' | null>(null);

  const reset = () => {
    start.current = null;
    locked.current = null;
    setOffset(0);
  };

  return {
    offset,
    armed: offset <= -TRIGGER_PX,
    handlers: {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        locked.current = null;
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        const origin = start.current;
        if (!origin || origin.id !== e.pointerId) return;
        const dx = e.clientX - origin.x;
        const dy = e.clientY - origin.y;
        if (!locked.current && Math.max(Math.abs(dx), Math.abs(dy)) > LOCK_PX) {
          locked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          if (locked.current === 'x') {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* capture is a nicety (keeps the drag alive outside the card); the gesture works without it */
            }
          }
        }
        if (locked.current === 'x') setOffset(Math.max(-MAX_PX, Math.min(0, dx)));
      },
      onPointerUp(e: PointerEvent<HTMLElement>) {
        if (start.current?.id !== e.pointerId) return;
        const triggered = locked.current === 'x' && offset <= -TRIGGER_PX;
        reset();
        if (triggered) onTrigger();
      },
      onPointerCancel: reset,
    },
  };
}
