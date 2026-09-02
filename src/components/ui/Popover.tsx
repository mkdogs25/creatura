import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  /** Screen coordinates to anchor at, or an element rect — same shape `useMenu` produces. */
  anchor: { x: number; y: number } | DOMRect;
  onClose: () => void;
  align?: 'start' | 'end';
  title?: string;
  children: ReactNode;
}

/**
 * A portal panel anchored to a trigger element, for small interactive controls
 * (a form, a combobox) that don't fit `Menu`'s list-of-actions shape. Shares
 * `Menu`'s positioning and outside-click/Escape dismissal so both feel like
 * the same kind of popup.
 */
export function Popover({ anchor, onClose, align = 'start', title, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const isPoint = !(anchor instanceof DOMRect);
    const baseX = isPoint ? (anchor as { x: number }).x : align === 'end' ? anchor.right : anchor.left;
    const baseY = isPoint ? (anchor as { y: number }).y : anchor.bottom + 6;
    let left = align === 'end' && !isPoint ? baseX - rect.width : baseX;
    let top = baseY;
    left = Math.min(Math.max(8, left), window.innerWidth - rect.width - 8);
    if (top + rect.height > window.innerHeight - 8) {
      top = Math.max(8, (isPoint ? baseY : (anchor as DOMRect).top - 6) - rect.height);
    }
    setPosition({ top, left });
  }, [anchor, align]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      style={{ top: position.top, left: position.left }}
      className="fixed z-[150] w-72 animate-rise rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] p-3 shadow-[var(--shadow-float)]"
    >
      {title && <h3 className="type-label mb-2">{title}</h3>}
      {children}
    </div>,
    document.body,
  );
}

export function PopoverHost({
  anchor,
  onClose,
  align,
  title,
  children,
}: {
  anchor: { x: number; y: number } | DOMRect | null;
  onClose: () => void;
  align?: 'start' | 'end';
  title?: string;
  children: ReactNode;
}): ReactNode {
  if (!anchor) return null;
  return (
    <Popover anchor={anchor} onClose={onClose} align={align} title={title}>
      {children}
    </Popover>
  );
}
