import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  children?: ReactNode;
  compact?: boolean;
}

/** Context-specific empty state — always says what to do next, never just "no data". */
export function EmptyState({ icon: Icon, title, body, children, compact }: EmptyStateProps) {
  return (
    <div
      className={`flex h-full flex-col items-center justify-center px-6 text-center ${
        compact ? 'py-8' : 'py-16'
      }`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface-sunken)]">
        <Icon size={20} className="text-[var(--color-ink-faint)]" aria-hidden="true" />
      </div>
      <h3 className="type-display text-[1.3rem] leading-tight text-[var(--color-ink)]">{title}</h3>
      {body && (
        <p className="mt-2 max-w-sm text-[0.83rem] leading-relaxed text-[var(--color-ink-muted)]">
          {body}
        </p>
      )}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
