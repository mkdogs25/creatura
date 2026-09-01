import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Hide the close affordance for flows that must be resolved by a choice. */
  hideClose?: boolean;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Portal-rendered dialog with focus trapping and Escape-to-close.
 *
 * Focus is moved into the dialog on open and restored to the invoking element
 * on close, which is what keeps keyboard-only navigation coherent when
 * dialogs are opened from the command palette.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button:not([data-modal-close]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const targets = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (targets.length === 0) return;
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] animate-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        className={cn(
          'relative my-auto w-full animate-rise rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] shadow-[var(--shadow-float)]',
          SIZES[size],
        )}
      >
        {(title || !hideClose) && (
          <header className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2 className="type-display text-[1.15rem] leading-tight text-[var(--color-ink)]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-[0.8rem] leading-relaxed text-[var(--color-ink-muted)]">
                  {description}
                </p>
              )}
            </div>
            {!hideClose && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close dialog"
                data-modal-close
              >
                <X size={15} />
              </Button>
            )}
          </header>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-[var(--color-line)] px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
