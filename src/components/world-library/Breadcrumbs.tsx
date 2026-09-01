import { ChevronRight } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { docById, folderPath } from '@/store/selectors';

/** World Library / Characters / Elysia Ambrose — every step is clickable. */
export function Breadcrumbs() {
  const bundle = useProjectStore((s) => s.bundle);
  const updateFolder = useProjectStore((s) => s.updateFolder);
  const activeDocId = useEditorStore((s) => s.activeDocId);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);

  const doc = docById(bundle, activeDocId);
  const path = folderPath(bundle, doc?.folderId ?? null);

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[0.74rem]">
      <button
        type="button"
        onClick={() => setActiveDoc(null)}
        className="shrink-0 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
      >
        World Library
      </button>
      {path.map((folder) => (
        <span key={folder.id} className="flex min-w-0 items-center gap-1">
          <ChevronRight size={11} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              // Reveal the folder in the tree rather than navigating away.
              updateFolder(folder.id, { collapsed: false });
              setActiveDoc(null);
            }}
            className="truncate text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
          >
            {folder.name}
          </button>
        </span>
      ))}
      {doc && (
        <span className="flex min-w-0 items-center gap-1">
          <ChevronRight size={11} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
          <span className="truncate text-[var(--color-ink-muted)]" aria-current="page">
            {doc.name}
          </span>
        </span>
      )}
    </nav>
  );
}
