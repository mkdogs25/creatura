import { useEffect, useMemo, useState } from 'react';
import { BookOpen, MapPin, PanelLeft, Plus, User, X } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { allDocs, docById } from '@/store/selectors';
import { FolderTree } from '@/components/world-library/FolderTree';
import { DocumentHeader } from '@/components/world-library/DocumentHeader';
import { DocumentTabs } from '@/components/world-library/DocumentTabs';
import { Tooltip } from '@/components/ui/Tooltip';
import { ManuscriptEditor } from '@/components/editor/ManuscriptEditor';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { FindReplaceBar } from '@/components/editor/FindReplaceBar';
import { EditorStatusBar } from '@/components/editor/EditorStatusBar';
import { MetadataPanel } from '@/components/metadata/MetadataPanel';
import { MapBuilder } from '@/components/map/MapBuilder';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { FocusEdgePanel } from '@/components/ui/FocusEdgePanel';
import { cn } from '@/utils/cn';

const LEFT_WIDTH = { min: 200, max: 460 };
const RIGHT_WIDTH = { min: 240, max: 520 };

/**
 * The primary workspace: library on the left, manuscript in the middle,
 * details on the right.
 *
 * The centre column — including the Tiptap instance — is mounted once and
 * never conditionally removed, so panel toggles and focus mode animate around
 * a live editor rather than tearing it down.
 */
export function WorldLibraryView() {
  const bundle = useProjectStore((s) => s.bundle);
  const createDoc = useProjectStore((s) => s.createDoc);
  const updateDocContent = useProjectStore((s) => s.updateDocContent);
  const activeDocId = useEditorStore((s) => s.activeDocId);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const editor = useEditorStore((s) => s.editor);

  const focusMode = useUiStore((s) => s.focusMode);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const leftOpen = useUiStore((s) => s.leftPanelOpen);
  const rightOpen = useUiStore((s) => s.rightPanelOpen);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);
  const isNarrow = useUiStore((s) => s.isNarrow);
  const mapOpen = useUiStore((s) => s.mapOpen);

  const interfaceSettings = useSettingsStore((s) => s.settings.interface);
  const showToolbar = useSettingsStore((s) => s.settings.editor.showToolbar);
  const updateSettings = useSettingsStore((s) => s.update);
  const [resizing, setResizing] = useState<'left' | 'right' | null>(null);

  const doc = useMemo(() => docById(bundle, activeDocId), [bundle, activeDocId]);
  const documents = useMemo(() => allDocs(bundle), [bundle]);
  const pruneTabs = useEditorStore((s) => s.pruneTabs);

  // If a doc behind an open tab (active or not) is deleted elsewhere, drop
  // its tab rather than leaving one pointing at nothing.
  useEffect(() => {
    pruneTabs(new Set(documents.map((d) => d.id)));
  }, [documents, pruneTabs]);

  const showLeft = leftOpen && !focusMode && !isNarrow;
  const showRight = rightOpen && !focusMode && !isNarrow && Boolean(doc);
  const showMap = mapOpen && doc?.kind === 'location' && !focusMode;

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left panel — the library */}
      <aside
        aria-label="Project library"
        className={cn(
          'shrink-0 overflow-hidden bg-[var(--color-surface)] ease-[var(--ease-out-soft)]',
          resizing === 'left' ? '' : 'transition-[width,opacity] duration-200',
          showLeft ? 'opacity-100' : 'w-0 opacity-0',
        )}
        style={{ width: showLeft ? interfaceSettings.leftPanelWidth : 0 }}
      >
        {/* Skip the column entirely on narrow screens — it becomes a drawer. */}
        {!isNarrow && (
          <div style={{ width: interfaceSettings.leftPanelWidth }} className="h-full">
            <FolderTree onCollapse={() => toggleLeftPanel(false)} />
          </div>
        )}
      </aside>
      {showLeft && (
        <ResizeHandle
          side="left"
          label="Resize library panel"
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
            <span className="type-label truncate">{doc?.name ?? 'Focus'}</span>
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
          <FolderTree />
        </FocusEdgePanel>
      )}
      {focusMode && doc && (
        <FocusEdgePanel edge="right" size={interfaceSettings.rightPanelWidth}>
          <MetadataPanel />
        </FocusEdgePanel>
      )}

      {/* Centre panel — the manuscript. Never unmounted. */}
      <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
        <FindReplaceBar />

        {!showLeft && !focusMode && !isNarrow && (
          <Tooltip label="Show library panel">
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Show library panel"
              onClick={() => toggleLeftPanel(true)}
              className="absolute top-2 left-2 z-20 shadow-[var(--shadow-float)]"
            >
              <PanelLeft size={14} />
            </Button>
          </Tooltip>
        )}

        {!focusMode && <DocumentTabs />}

        {doc && !focusMode && <DocumentHeader doc={doc} />}

        <div className={cn('flex min-h-0 flex-1', showMap ? 'flex-col xl:flex-row' : '')}>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* The editor stays mounted; only its visibility changes. */}
            <div className={cn('flex min-h-0 flex-1 flex-col', !doc && 'hidden')}>
              {showToolbar && !focusMode && (
                <div className="shrink-0 border-b border-[var(--color-line)]">
                  <EditorToolbar editor={editor} />
                </div>
              )}
              <div className="min-h-0 flex-1">
                <ManuscriptEditor
                  activeId={activeDocId}
                  getContent={(id) => docById(bundle, id)?.content ?? null}
                  onSave={updateDocContent}
                  ariaLabel="Manuscript"
                />
              </div>
              <EditorStatusBar />
            </div>

            {!doc && (
              <EmptyState
                icon={BookOpen}
                title="Your world is waiting."
                body={
                  documents.length > 0
                    ? 'Choose an entry from the library, or start something new.'
                    : 'Nothing has been written yet. Start with a character, a place, or a plain note.'
                }
              >
                <Button
                  variant="primary"
                  onClick={() => setActiveDoc(createDoc({ kind: 'character' }))}
                >
                  <User size={14} />
                  Create character
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setActiveDoc(createDoc({ kind: 'location' }))}
                >
                  <MapPin size={14} />
                  Create location
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setActiveDoc(createDoc({ kind: 'note' }))}
                >
                  <Plus size={14} />
                  Create note
                </Button>
              </EmptyState>
            )}
          </div>

          {showMap && (
            <section
              aria-label="Map"
              className="min-h-[18rem] shrink-0 border-t border-[var(--color-line)] xl:h-auto xl:w-[28rem] xl:border-t-0 xl:border-l"
            >
              <MapBuilder mapId={doc?.kind === 'location' ? doc.mapId : null} />
            </section>
          )}
        </div>
      </main>

      {/* Right panel — details */}
      {showRight && (
        <ResizeHandle
          side="right"
          label="Resize details panel"
          value={interfaceSettings.rightPanelWidth}
          min={RIGHT_WIDTH.min}
          max={RIGHT_WIDTH.max}
          onChange={(rightPanelWidth) => updateSettings('interface', { rightPanelWidth })}
          onDragStart={() => setResizing('right')}
          onDragEnd={() => setResizing(null)}
        />
      )}
      <aside
        aria-label="Entry details"
        className={cn(
          'shrink-0 overflow-hidden bg-[var(--color-surface)] ease-[var(--ease-out-soft)]',
          resizing === 'right' ? '' : 'transition-[width,opacity] duration-200',
          showRight ? 'opacity-100' : 'w-0 opacity-0',
        )}
        style={{ width: showRight ? interfaceSettings.rightPanelWidth : 0 }}
      >
        {!isNarrow && (
          <div style={{ width: interfaceSettings.rightPanelWidth }} className="h-full">
            <MetadataPanel />
          </div>
        )}
      </aside>

      {/* On small screens the side panels become drawers instead of columns. */}
      <Drawer
        open={isNarrow && leftOpen && !focusMode}
        onClose={() => toggleLeftPanel(false)}
        side="left"
        title="Library"
        width="w-[85vw] max-w-[20rem]"
      >
        <FolderTree />
      </Drawer>
      <Drawer
        open={isNarrow && rightOpen && !focusMode && Boolean(doc)}
        onClose={() => toggleRightPanel(false)}
        side="right"
        title={doc?.name ?? 'Details'}
        width="w-[88vw] max-w-[22rem]"
      >
        <MetadataPanel />
      </Drawer>
    </div>
  );
}
