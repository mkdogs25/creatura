import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-[1.06] active:brightness-95 font-medium',
  secondary:
    'bg-[var(--color-surface-raised)] text-[var(--color-ink)] border border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-overlay)]',
  ghost:
    'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-raised)]',
  subtle:
    'bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
  danger:
    'bg-transparent text-[var(--color-danger)] border border-[color-mix(in_oklab,var(--color-danger)_40%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-danger)_12%,transparent)]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[0.78rem] gap-1.5',
  md: 'h-9 px-3.5 text-[0.85rem] gap-2',
  lg: 'h-11 px-5 text-[0.92rem] gap-2',
  icon: 'h-9 w-9 justify-center',
  'icon-sm': 'h-7 w-7 justify-center',
};

/** The single button primitive; every clickable control in Creatura uses it. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center rounded-[var(--radius-control)] whitespace-nowrap',
        'transition-[background-color,color,border-color,filter] duration-150',
        'disabled:opacity-45 disabled:pointer-events-none select-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
