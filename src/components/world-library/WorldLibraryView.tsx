import { useEffect, useMemo } from 'react';
import { BookOpen, MapPin, Plus, User, X } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { allDocs, docById } from '@/store/selectors';
import { FolderTree } from '@/components/world-library/FolderTree';
import { DocumentHeader } from '@/components/world-library/DocumentHeader';
import { ManuscriptEditor } from '@/components/editor/ManuscriptEditor';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { EditorStatusBar } from '@/components/editor/EditorStatusBar';
import { MetadataPanel } from '@/components/metadata/MetadataPanel';
import { MapBuilder } from '@/components/map/MapBuilder';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { cn } from '@/utils/cn';

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

  const doc = useMemo(() => docById(bundle, activeDocId), [bundle, activeDocId]);
  const documents = useMemo(() => allDocs(bundle), [bundle]);

  // If the open document is deleted elsewhere, fall back to the empty state
  // rather than leaving a header pointing at nothing.
  useEffect(() => {
    if (activeDocId && !doc) setActiveDoc(null);
  }, [activeDocId, doc, setActiveDoc]);

  const showLeft = leftOpen && !focusMode && !isNarrow;
  const showRight = rightOpen && !focusMode && !isNarrow && Boolean(doc);
  const showMap = mapOpen && doc?.kind === 'location' && !focusMode;

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left panel — the library */}
      <aside
        aria-label="Project library"
        className={cn(
          'shrink-0 overflow-hidden border-r border-[var(--color-line)] bg-[var(--color-surface)] transition-[width,opacity] duration-200 ease-[var(--ease-out-soft)]',
          showLeft ? 'opacity-100' : 'w-0 border-r-0 opacity-0',
        )}
        style={{ width: showLeft ? interfaceSettings.leftPanelWidth : 0 }}
      >
        {/* Skip the column entirely on narrow screens — it becomes a drawer. */}
        {!isNarrow && (
          <div style={{ width: interfaceSettings.leftPanelWidth }} className="h-full">
            <FolderTree />
          </div>
        )}
      </aside>

      {/* Centre panel — the manuscript. Never unmounted. */}
      <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
        {focusMode && (
          <div className="flex shrink-0 items-center justify-between px-4 py-2">
            <span className="type-label truncate">{doc?.name ?? 'Focus'}</span>
            <Button variant="ghost" size="sm" onClick={() => setFocusMode(false)}>
              <X size={13} />
              Exit focus · Esc
            </Button>
          </div>
        )}

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
                <ManuscriptEditor />
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
      <aside
        aria-label="Entry details"
        className={cn(
          'shrink-0 overflow-hidden border-l border-[var(--color-line)] bg-[var(--color-surface)] transition-[width,opacity] duration-200 ease-[var(--ease-out-soft)]',
          showRight ? 'opacity-100' : 'w-0 border-l-0 opacity-0',
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
