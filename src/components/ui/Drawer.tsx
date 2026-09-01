import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title?: ReactNode;
  subtitle?: ReactNode;
  width?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Edge-anchored panel used for the event editor and the mobile side panels. */
export function Drawer({
  open,
  onClose,
  side = 'right',
  title,
  subtitle,
  width = 'w-full sm:w-[26rem]',
  children,
  footer,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/40 animate-in" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Panel'}
        className={cn(
          'absolute top-0 bottom-0 flex flex-col border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-float)]',
          side === 'right' ? 'right-0 border-l animate-slide-right' : 'left-0 border-r animate-in',
          width,
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-[0.95rem] font-semibold text-[var(--color-ink)]">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-[0.74rem] text-[var(--color-ink-faint)]">{subtitle}</p>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
            <X size={15} />
          </Button>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-between gap-2 border-t border-[var(--color-line)] px-4 py-3">
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}
