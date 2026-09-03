import { useEffect, useMemo, useState } from 'react';
import { BookText, PanelLeft, X } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { chapterById, orderedChapters } from '@/store/selectors';
import { ChapterSidebar } from '@/components/manuscript/ChapterSidebar';
import { ChapterHeader } from '@/components/manuscript/ChapterHeader';
import { ManuscriptEditor } from '@/components/editor/ManuscriptEditor';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { FindReplaceBar } from '@/components/editor/FindReplaceBar';
import { EditorStatusBar } from '@/components/editor/EditorStatusBar';
import { ManuscriptDetailsPanel } from '@/components/manuscript/ManuscriptDetailsPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Drawer } from '@/components/ui/Drawer';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { FocusEdgePanel } from '@/components/ui/FocusEdgePanel';
import { cn } from '@/utils/cn';

const LEFT_WIDTH = { min: 200, max: 460 };
const RIGHT_WIDTH = { min: 240, max: 520 };

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
  const updateSettings = useSettingsStore((s) => s.update);
  const [resizing, setResizing] = useState<'left' | 'right' | null>(null);

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
          'shrink-0 overflow-hidden bg-[var(--color-surface)] ease-[var(--ease-out-soft)]',
          resizing === 'left' ? '' : 'transition-[width,opacity] duration-200',
          showLeft ? 'opacity-100' : 'w-0 opacity-0',
        )}
        style={{ width: showLeft ? interfaceSettings.leftPanelWidth : 0 }}
      >
        {!isNarrow && (
          <div style={{ width: interfaceSettings.leftPanelWidth }} className="h-full">
            <ChapterSidebar onCollapse={() => toggleLeftPanel(false)} />
          </div>
        )}
      </aside>
      {showLeft && (
        <ResizeHandle
          side="left"
          label="Resize chapter list panel"
          value={interfaceSettings.leftPanelWidth}
          min={LEFT_WIDTH.min}
          max={LEFT_WIDTH.max}
          onChange={(leftPanelWidth) => updateSettings('interface', { leftPanelWidth })}
          onDragStart={() => setResizing('left')}
          onDragEnd={() => setResizing(null)}
        />
      )}

      {/* Focus mode: panels stay off-screen until the cursor lingers at an edge. */}
      {focusMode && (
        <FocusEdgePanel edge="top" size={showToolbar ? 88 : 45}>
          <div className="flex h-11 shrink-0 items-center justify-between px-4">
            <span className="type-label truncate">{chapter?.title ?? 'Focus'}</span>
            <Button variant="ghost" size="sm" onClick={() => setFocusMode(false)}>
              <X size={13} />
              Exit focus · Esc
            </Button>
          </div>
          {showToolbar && (
            <div className="border-t border-[var(--color-line)]">
              <EditorToolbar editor={editor} />
            </div>
          )}
        </FocusEdgePanel>
      )}
      {focusMode && (
        <FocusEdgePanel edge="left" size={interfaceSettings.leftPanelWidth}>
          <ChapterSidebar />
        </FocusEdgePanel>
      )}
      {focusMode && chapter && (
        <FocusEdgePanel edge="right" size={interfaceSettings.rightPanelWidth}>
          <ManuscriptDetailsPanel />
        </FocusEdgePanel>
      )}

      {/* Centre panel — the draft. Never unmounted. */}
      <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
        <FindReplaceBar />

        {!showLeft && !focusMode && !isNarrow && (
          <Tooltip label="Show chapter list panel">
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Show chapter list panel"
              onClick={() => toggleLeftPanel(true)}
              className="absolute top-2 left-2 z-20 shadow-[var(--shadow-float)]"
            >
              <PanelLeft size={14} />
            </Button>
          </Tooltip>
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
      {showRight && (
        <ResizeHandle
          side="right"
          label="Resize chapter details panel"
          value={interfaceSettings.rightPanelWidth}
          min={RIGHT_WIDTH.min}
          max={RIGHT_WIDTH.max}
          onChange={(rightPanelWidth) => updateSettings('interface', { rightPanelWidth })}
          onDragStart={() => setResizing('right')}
          onDragEnd={() => setResizing(null)}
        />
      )}
      <aside
        aria-label="Chapter details"
        className={cn(
          'shrink-0 overflow-hidden bg-[var(--color-surface)] ease-[var(--ease-out-soft)]',
          resizing === 'right' ? '' : 'transition-[width,opacity] duration-200',
          showRight ? 'opacity-100' : 'w-0 opacity-0',
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
