import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

interface ResizeHandleProps {
  /** Which panel this handle widens — dragging right grows a left panel,
   * shrinks a right one, so the two need opposite sign conventions. */
  side: 'left' | 'right';
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  /** Lets the caller suspend the panel's width transition while dragging,
   * so the resize tracks the pointer instead of chasing it 200ms behind. */
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const STEP = 12;

/**
 * A draggable divider between a side panel and the centre column.
 *
 * Tracks the drag with document-level listeners rather than pointer capture
 * on the handle itself: the handle is a thin 4px strip that visibly moves as
 * the panel resizes, and capture tied to a moving element is exactly the
 * kind of thing that silently stops delivering events mid-drag in some
 * browsers. A `mousedown`-triggered document listener has no such problem —
 * it keeps receiving movement regardless of where the handle ends up.
 */
export function ResizeHandle({
  side,
  value,
  min,
  max,
  onChange,
  label,
  onDragStart,
  onDragEnd,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; value: number } | null>(null);
  // Read the latest callbacks from a ref so the document-level listeners
  // (attached once per drag) never close over a stale `onChange`/`value`.
  const liveRef = useRef({ onChange, min, max, side });
  liveRef.current = { onChange, min, max, side };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: PointerEvent) => {
      const origin = dragRef.current;
      if (!origin) return;
      const { onChange: change, min: lo, max: hi, side: s } = liveRef.current;
      const delta = event.clientX - origin.x;
      const signed = s === 'left' ? delta : -delta;
      change(Math.min(hi, Math.max(lo, Math.round(origin.value + signed))));
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      onDragEnd?.();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className="group relative w-1 shrink-0 cursor-col-resize touch-none focus-visible:outline-none"
      onPointerDown={(event) => {
        dragRef.current = { x: event.clientX, value };
        setDragging(true);
        onDragStart?.();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onChange(Math.max(min, value + (side === 'left' ? -STEP : STEP)));
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          onChange(Math.min(max, value + (side === 'left' ? STEP : -STEP)));
        }
      }}
    >
      <span
        className={cn(
          'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--color-line)] transition-colors',
          'group-hover:bg-[var(--color-accent)] group-focus-visible:bg-[var(--color-accent)]',
          dragging && 'bg-[var(--color-accent)]',
        )}
        aria-hidden="true"
      />
    </div>
  );
}
