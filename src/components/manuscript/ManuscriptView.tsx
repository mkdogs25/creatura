import { useEffect, useMemo } from 'react';
import { BookText, X } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { chapterById, orderedChapters } from '@/store/selectors';
import { ChapterSidebar } from '@/components/manuscript/ChapterSidebar';
import { ChapterHeader } from '@/components/manuscript/ChapterHeader';
import { ManuscriptEditor } from '@/components/editor/ManuscriptEditor';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { EditorStatusBar } from '@/components/editor/EditorStatusBar';
import { ManuscriptDetailsPanel } from '@/components/manuscript/ManuscriptDetailsPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { cn } from '@/utils/cn';

/**
 * The manuscript workspace: a mirror of World Library's three-column layout,
 * but for the chaptered draft rather than the world bible — a flat, ordered
 * list of chapters instead of a nested tree.
 */
export function ManuscriptView() {
  const bundle = useProjectStore((s) => s.bundle);
  const createChapter = useProjectStore((s) => s.createChapter);
  const updateChapterContent = useProjectStore((s) => s.updateChapterContent);
  const activeChapterId = useEditorStore((s) => s.activeChapterId);
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter);
  const editor = useEditorStore((s) => s.editor);

  const focusMode = useUiStore((s) => s.focusMode);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const leftOpen = useUiStore((s) => s.leftPanelOpen);
  const rightOpen = useUiStore((s) => s.rightPanelOpen);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);
  const isNarrow = useUiStore((s) => s.isNarrow);

  const interfaceSettings = useSettingsStore((s) => s.settings.interface);
  const showToolbar = useSettingsStore((s) => s.settings.editor.showToolbar);

  const chapter = useMemo(() => chapterById(bundle, activeChapterId), [bundle, activeChapterId]);
  const chapters = useMemo(() => orderedChapters(bundle), [bundle]);

  // If the open chapter is deleted elsewhere, fall back to the empty state.
  useEffect(() => {
    if (activeChapterId && !chapter) setActiveChapter(null);
  }, [activeChapterId, chapter, setActiveChapter]);

  const showLeft = leftOpen && !focusMode && !isNarrow;
  const showRight = rightOpen && !focusMode && !isNarrow && Boolean(chapter);

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left panel — the chapter list */}
      <aside
        aria-label="Manuscript chapters"
        className={cn(
          'shrink-0 overflow-hidden border-r border-[var(--color-line)] bg-[var(--color-surface)] transition-[width,opacity] duration-200 ease-[var(--ease-out-soft)]',
          showLeft ? 'opacity-100' : 'w-0 border-r-0 opacity-0',
        )}
        style={{ width: showLeft ? interfaceSettings.leftPanelWidth : 0 }}
      >
        {!isNarrow && (
          <div style={{ width: interfaceSettings.leftPanelWidth }} className="h-full">
            <ChapterSidebar />
          </div>
        )}
      </aside>

      {/* Centre panel — the draft. Never unmounted. */}
      <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
        {focusMode && (
          <div className="flex shrink-0 items-center justify-between px-4 py-2">
            <span className="type-label truncate">{chapter?.title ?? 'Focus'}</span>
            <Button variant="ghost" size="sm" onClick={() => setFocusMode(false)}>
              <X size={13} />
              Exit focus · Esc
            </Button>
          </div>
        )}

        {chapter && !focusMode && <ChapterHeader chapter={chapter} />}

        <div className="flex min-h-0 flex-1 flex-col">
          {/* The editor stays mounted; only its visibility changes. */}
          <div className={cn('flex min-h-0 flex-1 flex-col', !chapter && 'hidden')}>
            {showToolbar && !focusMode && (
              <div className="shrink-0 border-b border-[var(--color-line)]">
                <EditorToolbar editor={editor} />
              </div>
            )}
            <div className="min-h-0 flex-1">
              <ManuscriptEditor
                activeId={activeChapterId}
                getContent={(id) => chapterById(bundle, id)?.content ?? null}
                onSave={updateChapterContent}
                ariaLabel="Chapter manuscript"
              />
            </div>
            <EditorStatusBar />
          </div>

          {!chapter && (
            <EmptyState
              icon={BookText}
              title="Your draft is waiting."
              body={
                chapters.length > 0
                  ? 'Choose a chapter from the list, or start a new one.'
                  : 'Nothing written yet. Start the first chapter of your manuscript.'
              }
            >
              <Button
                variant="primary"
                onClick={() => setActiveChapter(createChapter({ order: chapters.length }))}
              >
                <BookText size={14} />
                New chapter
              </Button>
            </EmptyState>
          )}
        </div>
      </main>

      {/* Right panel — details */}
      <aside
        aria-label="Chapter details"
        className={cn(
          'shrink-0 overflow-hidden border-l border-[var(--color-line)] bg-[var(--color-surface)] transition-[width,opacity] duration-200 ease-[var(--ease-out-soft)]',
          showRight ? 'opacity-100' : 'w-0 border-l-0 opacity-0',
        )}
        style={{ width: showRight ? interfaceSettings.rightPanelWidth : 0 }}
      >
        {!isNarrow && (
          <div style={{ width: interfaceSettings.rightPanelWidth }} className="h-full">
            <ManuscriptDetailsPanel />
          </div>
        )}
      </aside>

      {/* On small screens the side panels become drawers instead of columns. */}
      <Drawer
        open={isNarrow && leftOpen && !focusMode}
        onClose={() => toggleLeftPanel(false)}
        side="left"
        title="Manuscript"
        width="w-[85vw] max-w-[20rem]"
      >
        <ChapterSidebar />
      </Drawer>
      <Drawer
        open={isNarrow && rightOpen && !focusMode && Boolean(chapter)}
        onClose={() => toggleRightPanel(false)}
        side="right"
        title={chapter?.title ?? 'Details'}
        width="w-[88vw] max-w-[22rem]"
      >
        <ManuscriptDetailsPanel />
      </Drawer>
    </div>
  );
}
