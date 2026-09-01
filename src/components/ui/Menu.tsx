import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export type MenuEntry = MenuItem | { id: string; separator: true } | { id: string; heading: string };

interface MenuProps {
  /** Screen coordinates to anchor at, or an element rect. */
  anchor: { x: number; y: number } | DOMRect;
  entries: MenuEntry[];
  onClose: () => void;
  align?: 'start' | 'end';
}

function isItem(entry: MenuEntry): entry is MenuItem {
  return 'onSelect' in entry;
}

/**
 * Portal dropdown used for both right-click context menus and header menus.
 * Positions itself inside the viewport and supports arrow-key navigation.
 */
export function Menu({ anchor, entries, onClose, align = 'start' }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const items = entries.filter(isItem);
  const [activeIndex, setActiveIndex] = useState(0);

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
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(1, items.length));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % Math.max(1, items.length));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = items[activeIndex];
        if (item && !item.disabled) {
          item.onSelect();
          onClose();
        }
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose, items, activeIndex]);

  let itemIndex = -1;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      tabIndex={-1}
      style={{ top: position.top, left: position.left }}
      className="fixed z-[150] min-w-[12rem] animate-rise overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] py-1 shadow-[var(--shadow-float)]"
    >
      {entries.map((entry) => {
        if ('separator' in entry) {
          return <div key={entry.id} role="separator" className="my-1 h-px bg-[var(--color-line)]" />;
        }
        if ('heading' in entry) {
          return (
            <div key={entry.id} className="type-label px-3 pt-2 pb-1">
              {entry.heading}
            </div>
          );
        }
        itemIndex += 1;
        const index = itemIndex;
        const Icon = entry.icon;
        return (
          <button
            key={entry.id}
            role="menuitem"
            type="button"
            disabled={entry.disabled}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => {
              entry.onSelect();
              onClose();
            }}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[0.82rem] transition-colors disabled:opacity-40',
              entry.destructive ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]',
              activeIndex === index && !entry.disabled && 'bg-[var(--color-surface-raised)]',
            )}
          >
            {Icon && <Icon size={14} className="shrink-0 opacity-70" aria-hidden="true" />}
            <span className="flex-1 truncate">{entry.label}</span>
            {entry.shortcut && (
              <span className="font-mono text-[0.68rem] text-[var(--color-ink-faint)]">
                {entry.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

/** Convenience hook: manages open state and the anchor for a Menu. */
export function useMenu() {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | DOMRect | null>(null);
  return {
    anchor,
    close: () => setAnchor(null),
    openAt: (event: { clientX: number; clientY: number; preventDefault?: () => void }) => {
      event.preventDefault?.();
      setAnchor({ x: event.clientX, y: event.clientY });
    },
    openFrom: (element: HTMLElement | null) => {
      if (element) setAnchor(element.getBoundingClientRect());
    },
  };
}

export function MenuHost({
  anchor,
  entries,
  onClose,
  align,
}: {
  anchor: { x: number; y: number } | DOMRect | null;
  entries: MenuEntry[];
  onClose: () => void;
  align?: 'start' | 'end';
}): ReactNode {
  if (!anchor) return null;
  return <Menu anchor={anchor} entries={entries} onClose={onClose} align={align} />;
}
