import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface FocusEdgePanelProps {
  edge: 'left' | 'right' | 'top';
  /** Width (left/right) or height (top) of the revealed panel, in px. */
  size: number;
  children: ReactNode;
  /** Width/height of the invisible strip along the edge that triggers reveal. */
  hotZoneSize?: number;
}

const HIDE_DELAY = 220;

/**
 * A panel that stays out of the way in focus mode and slides in only while
 * the cursor lingers at its edge of the screen — library/chapters on the
 * left, details on the right, the document header and toolbar at the top.
 * Leaving either the hot zone or the panel itself starts a short close timer
 * so crossing the gap between them doesn't flicker it shut.
 */
export function FocusEdgePanel({ edge, size, children, hotZoneSize = 14 }: FocusEdgePanelProps) {
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const clearTimer = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const show = () => {
    clearTimer();
    setVisible(true);
  };

  const scheduleHide = () => {
    clearTimer();
    closeTimer.current = window.setTimeout(() => setVisible(false), HIDE_DELAY);
  };

  const hotZoneStyle: CSSProperties =
    edge === 'top'
      ? { top: 0, left: 0, right: 0, height: hotZoneSize }
      : edge === 'left'
        ? { top: 0, bottom: 0, left: 0, width: hotZoneSize }
        : { top: 0, bottom: 0, right: 0, width: hotZoneSize };

  const panelStyle: CSSProperties =
    edge === 'top'
      ? { top: 0, left: 0, right: 0, height: size }
      : edge === 'left'
        ? { top: 0, bottom: 0, left: 0, width: size }
        : { top: 0, bottom: 0, right: 0, width: size };

  const hiddenTransform =
    edge === 'top'
      ? 'translateY(-100%)'
      : edge === 'left'
        ? 'translateX(-100%)'
        : 'translateX(100%)';

  return (
    <>
      <div aria-hidden="true" className="fixed z-[130]" style={hotZoneStyle} onMouseEnter={show} />
      <div
        className={cn(
          'fixed z-[130] overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-float)]',
          'transition-transform duration-150 ease-[var(--ease-out-soft)]',
          edge === 'top' && 'border-b border-[var(--color-line)]',
          edge === 'left' && 'border-r border-[var(--color-line)]',
          edge === 'right' && 'border-l border-[var(--color-line)]',
        )}
        style={{ ...panelStyle, transform: visible ? 'none' : hiddenTransform }}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        {children}
      </div>
    </>
  );
}
