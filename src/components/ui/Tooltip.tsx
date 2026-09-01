import { useId, useState, type ReactElement, type ReactNode } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

interface TooltipProps {
  label: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactElement;
}

const SIDE_CLASS: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

/**
 * A CSS-positioned tooltip. It stays in the DOM only while shown so it never
 * competes for the accessibility tree, and it honours the Interface setting
 * that turns tooltips off entirely.
 */
export function Tooltip({ label, side = 'bottom', children }: TooltipProps) {
  const enabled = useSettingsStore((s) => s.settings.interface.tooltips);
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!enabled) return children;

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          id={id}
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-overlay)] px-2 py-1 text-[0.72rem] text-[var(--color-ink-muted)] shadow-[var(--shadow-float)] animate-in ${SIDE_CLASS[side]}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
