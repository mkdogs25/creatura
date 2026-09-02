import { useEffect, useState } from 'react';
import { AlertTriangle, Check, CloudOff, Loader2 } from 'lucide-react';
import { persistence } from '@/store/persistence';
import { useEditorStore } from '@/store/editorStore';
import type { SaveStatus } from '@/types/domain';
import { relativeTime } from '@/utils/text';

/**
 * The persistence indicator. It stays quiet by design — a writer should notice
 * it only when something has gone wrong or when they go looking for
 * reassurance.
 */
export function SaveIndicator() {
  const [status, setStatus] = useState<SaveStatus>(persistence.getStatus());
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(persistence.getLastSavedAt());
  const dirty = useEditorStore((s) => s.dirty);

  useEffect(
    () =>
      persistence.subscribe((next, savedAt) => {
        setStatus(next);
        setLastSavedAt(savedAt);
      }),
    [],
  );

  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 text-[var(--color-danger)]"
      >
        <AlertTriangle size={11} aria-hidden="true" />
        Unable to save changes · Retry
      </button>
    );
  }

  if (status === 'offline') {
    return (
      <span className="flex items-center gap-1.5 text-[var(--color-ink-faint)]">
        <CloudOff size={11} aria-hidden="true" />
        Offline — changes are held in this tab only
      </span>
    );
  }

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5" role="status">
        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  }

  if (dirty) {
    return <span className="text-[var(--color-ink-faint)]">Unsaved changes</span>;
  }

  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-[var(--color-success)]" role="status">
        <Check size={11} aria-hidden="true" />
        Saved just now
      </span>
    );
  }

  return (
    <span className="text-[var(--color-ink-faint)]">
      {lastSavedAt ? `Saved ${relativeTime(lastSavedAt)}` : 'All changes saved'}
    </span>
  );
}
