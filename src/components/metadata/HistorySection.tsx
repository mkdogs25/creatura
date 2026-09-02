import { useCallback, useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { listSnapshots, MAX_SNAPSHOTS } from '@/db/repositories/snapshotRepository';
import type { DocSnapshot, RichContent } from '@/types/domain';
import { relativeTime } from '@/utils/text';
import { Button } from '@/components/ui/Button';

interface HistorySectionProps {
  docId: string;
  updatedAt: number;
  /** Writes a restored version back — a Note/Character/Location or a chapter. */
  onRestore: (docId: string, content: RichContent) => void;
}

/**
 * Recent states of the open document.
 *
 * Not a version history — a short ring of restore points, so a bad paste or an
 * accidental select-all is recoverable after the autosave has already written.
 * Works for any document kind that keeps snapshots (world-library docs and
 * manuscript chapters alike) — the caller supplies how a restore is written.
 */
export function HistorySection({ docId, updatedAt, onRestore }: HistorySectionProps) {
  const reloadContent = useEditorStore((s) => s.reloadContent);
  const historyToken = useEditorStore((s) => s.historyToken);
  const confirm = useUiStore((s) => s.confirm);
  const toast = useUiStore((s) => s.toast);
  const [snapshots, setSnapshots] = useState<DocSnapshot[]>([]);

  const refresh = useCallback(() => {
    let cancelled = false;
    void listSnapshots(docId).then((rows) => {
      if (!cancelled) setSnapshots(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [docId]);

  // Re-read whenever a restore point actually lands, rather than guessing
  // from the save timestamp — the snapshot write finishes after it.
  useEffect(refresh, [refresh, updatedAt, historyToken]);

  if (snapshots.length === 0) {
    return (
      <p className="text-[0.76rem] leading-relaxed text-[var(--color-ink-faint)]">
        Restore points appear here as you write — up to {MAX_SNAPSHOTS} recent states of this
        entry.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {snapshots.map((snapshot) => (
        <li
          key={snapshot.id}
          className="group flex items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-[var(--color-surface-raised)]"
        >
          <History size={11} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.76rem] text-[var(--color-ink-muted)]">
              {relativeTime(snapshot.createdAt)}
            </span>
            <span className="block text-[0.68rem] text-[var(--color-ink-faint)]">
              {snapshot.wordCount.toLocaleString()} words
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Restore the version from ${relativeTime(snapshot.createdAt)}`}
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={async () => {
              const ok = await confirm({
                title: 'Restore this version?',
                body: `The entry goes back to how it read ${relativeTime(snapshot.createdAt)}.`,
                detail:
                  'The current text is saved as a restore point first, so this can be undone.',
                confirmLabel: 'Restore',
              });
              if (!ok) return;
              onRestore(docId, snapshot.content);
              reloadContent();
              refresh();
              toast({ tone: 'success', title: 'Version restored' });
            }}
          >
            <RotateCcw size={12} />
          </Button>
        </li>
      ))}
    </ul>
  );
}
