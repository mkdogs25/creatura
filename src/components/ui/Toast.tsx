import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useUiStore, type Toast as ToastData } from '@/store/uiStore';

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const TONE = {
  success: 'text-[var(--color-success)]',
  error: 'text-[var(--color-danger)]',
  info: 'text-[var(--color-accent)]',
};

function ToastRow({ toast }: { toast: ToastData }) {
  const dismiss = useUiStore((s) => s.dismissToast);
  const Icon = ICONS[toast.tone];

  useEffect(() => {
    if (toast.sticky) return;
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration ?? 4200);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-[22rem] max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] px-3.5 py-3 shadow-[var(--shadow-float)] animate-rise"
    >
      <Icon size={16} className={`mt-0.5 shrink-0 ${TONE[toast.tone]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.82rem] font-medium text-[var(--color-ink)]">{toast.title}</p>
        {toast.body && (
          <p className="mt-0.5 text-[0.76rem] leading-relaxed text-[var(--color-ink-muted)]">
            {toast.body}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onSelect();
              dismiss(toast.id);
            }}
            className="mt-1.5 text-[0.76rem] font-medium text-[var(--color-accent)] hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-0.5 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex flex-col-reverse gap-2">
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  );
}
