import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { docById } from '@/store/selectors';
import { docIcon } from '@/components/world-library/FolderTree';
import { cn } from '@/utils/cn';

/**
 * A browser-style tab strip above the writing surface, so several entries
 * can stay open at once instead of the library replacing whatever's open
 * every time something new is clicked. There's still only one live Tiptap
 * instance underneath — switching tabs swaps its content, same as clicking
 * a different entry in the library always did; tabs just remember the
 * places you've been so you can jump back without a trip through the tree.
 */
export function DocumentTabs() {
  const bundle = useProjectStore((s) => s.bundle);
  const openTabIds = useEditorStore((s) => s.openTabIds);
  const activeDocId = useEditorStore((s) => s.activeDocId);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const closeTab = useEditorStore((s) => s.closeTab);

  const tabs = useMemo(
    () => openTabIds.map((id) => docById(bundle, id)).filter((doc) => doc !== null),
    [openTabIds, bundle],
  );

  // Only a freshly-opened tab pops in — re-rendering the whole strip on
  // every switch would replay the animation on tabs that were already there.
  const seenIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const id of openTabIds) seenIds.current.add(id);
  }, [openTabIds]);

  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Open documents"
      className="scroll-thin flex shrink-0 items-stretch overflow-x-auto border-b border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      {tabs.map((doc) => {
        const Icon = docIcon(bundle, doc);
        const active = doc.id === activeDocId;
        const isNew = !seenIds.current.has(doc.id);
        return (
          <div
            key={doc.id}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            onClick={() => setActiveDoc(doc.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setActiveDoc(doc.id);
              }
            }}
            className={cn(
              'group flex min-w-0 max-w-[11rem] shrink-0 cursor-pointer items-center gap-1.5 border-r border-[var(--color-line)] px-2.5 py-1.5 text-[0.76rem] transition-colors',
              active
                ? 'bg-[var(--color-canvas)] text-[var(--color-ink)]'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)]',
              isNew && 'animate-pop',
            )}
          >
            <Icon size={12} className="shrink-0 opacity-70" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{doc.name}</span>
            <button
              type="button"
              aria-label={`Close ${doc.name}`}
              onClick={(event) => {
                event.stopPropagation();
                closeTab(doc.id);
              }}
              className={cn(
                'shrink-0 rounded p-0.5 text-[var(--color-ink-faint)] opacity-0 hover:bg-[var(--color-overlay)] hover:text-[var(--color-ink)] group-hover:opacity-100',
                active && 'opacity-70',
              )}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
