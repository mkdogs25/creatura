import { cn } from '@/utils/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Labelled toggle. The whole row is the hit target; the input stays real. */
export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <label
      className={cn(
        'flex items-start justify-between gap-4 py-2.5',
        disabled ? 'opacity-50' : 'cursor-pointer',
      )}
    >
      <span className="min-w-0">
        <span className="block text-[0.83rem] text-[var(--color-ink)]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[0.74rem] leading-relaxed text-[var(--color-ink-faint)]">
            {description}
          </span>
        )}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'block h-5 w-9 rounded-full border transition-colors duration-150',
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-accent)]',
            checked
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
              : 'border-[var(--color-line-strong)] bg-[var(--color-surface-sunken)]',
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-[3px] left-[3px] h-3.5 w-3.5 rounded-full transition-transform duration-150',
            checked
              ? 'translate-x-4 bg-[var(--color-accent-ink)]'
              : 'translate-x-0 bg-[var(--color-ink-faint)]',
          )}
        />
      </span>
    </label>
  );
}
