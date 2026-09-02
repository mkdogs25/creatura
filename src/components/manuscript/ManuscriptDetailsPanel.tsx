import { useMemo } from 'react';
import { History, Sparkles } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { allDocs, chapterById } from '@/store/selectors';
import { HistorySection } from '@/components/metadata/HistorySection';
import { EntitySuggestions } from '@/components/metadata/EntitySuggestions';
import { linkEntityInContent } from '@/features/mentions/entitySuggestions';
import { relativeTime } from '@/utils/text';

/** Word count, restore points and entity suggestions for the open chapter. */
export function ManuscriptDetailsPanel() {
  const bundle = useProjectStore((s) => s.bundle);
  const createDoc = useProjectStore((s) => s.createDoc);
  const updateChapterContent = useProjectStore((s) => s.updateChapterContent);
  const restoreChapterSnapshot = useProjectStore((s) => s.restoreChapterSnapshot);
  const reloadContent = useEditorStore((s) => s.reloadContent);
  const toast = useUiStore((s) => s.toast);
  const activeChapterId = useEditorStore((s) => s.activeChapterId);

  const chapter = chapterById(bundle, activeChapterId);
  const knownNames = useMemo(() => allDocs(bundle).map((d) => d.name), [bundle]);

  if (!chapter) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-[0.78rem] leading-relaxed text-[var(--color-ink-faint)]">
          Open a chapter to see its details here.
        </p>
      </div>
    );
  }

  const createFromSuggestion = (kind: 'character' | 'location', name: string) => {
    const id = createDoc({ kind, name });
    updateChapterContent(chapter.id, linkEntityInContent(chapter.content, name, id));
    reloadContent();
    toast({ tone: 'success', title: `Created “${name}”`, body: 'Mentions in this chapter now link to it.' });
  };

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="px-4 pt-3.5 pb-1">
        <p className="type-label">Chapter</p>
        <p className="mt-1 text-[0.7rem] text-[var(--color-ink-faint)]">
          Edited {relativeTime(chapter.updatedAt)} · {chapter.wordCount.toLocaleString()} words
        </p>
      </div>

      <section className="border-t border-[var(--color-line)] px-4 py-[var(--section-py)] first:border-t-0">
        <h3 className="type-label mb-2.5 flex items-center gap-1.5">
          <Sparkles size={11} aria-hidden="true" />
          Suggestions
        </h3>
        <EntitySuggestions
          key={chapter.id}
          content={chapter.content}
          knownNames={knownNames}
          onCreate={createFromSuggestion}
        />
      </section>

      <section className="border-t border-[var(--color-line)] px-4 py-[var(--section-py)]">
        <h3 className="type-label mb-2.5 flex items-center gap-1.5">
          <History size={11} aria-hidden="true" />
          Recent versions
        </h3>
        <HistorySection
          docId={chapter.id}
          updatedAt={chapter.updatedAt}
          onRestore={restoreChapterSnapshot}
        />
      </section>
    </div>
  );
}
