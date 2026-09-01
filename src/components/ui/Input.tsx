import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const FIELD =
  'w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-2.5 py-1.5 text-[0.85rem] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] transition-colors focus:border-[var(--color-accent)] focus:outline-none focus-visible:outline-none';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(FIELD, 'resize-y leading-relaxed', className)} {...props} />;
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(FIELD, 'cursor-pointer appearance-none bg-[var(--color-surface-sunken)] pr-7', className)}
      {...props}
    />
  );
});

interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

/** Label + control + optional hint, used throughout Settings and dialogs. */
export function Field({ label, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[0.78rem] font-medium text-[var(--color-ink)]">
        {label}
      </label>
      {children}
      {hint && <p className="text-[0.72rem] leading-relaxed text-[var(--color-ink-faint)]">{hint}</p>}
    </div>
  );
}
