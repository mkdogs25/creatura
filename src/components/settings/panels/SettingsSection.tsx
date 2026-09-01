import type { ReactNode } from 'react';

/** Shared card wrapper so every settings panel reads the same way. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-[var(--section-py)]">
      <h2 className="text-[0.86rem] font-semibold text-[var(--color-ink)]">{title}</h2>
      {description && (
        <p className="mt-0.5 mb-1 text-[0.76rem] leading-relaxed text-[var(--color-ink-muted)]">
          {description}
        </p>
      )}
      <div className="mt-2 divide-y divide-[var(--color-line)]">{children}</div>
    </section>
  );
}
