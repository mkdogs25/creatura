import { useEffect, useRef, useState } from 'react';
import { Focus, MoreHorizontal, PanelLeft, PanelRight, Trash2, Copy, Map } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Breadcrumbs } from '@/components/world-library/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { MenuHost, useMenu, type MenuEntry } from '@/components/ui/Menu';
import type { AnyDoc } from '@/types/domain';

/** Title, path and per-document actions above the writing surface. */
export function DocumentHeader({ doc }: { doc: AnyDoc }) {
  const updateDoc = useProjectStore((s) => s.updateDoc);
  const deleteDoc = useProjectStore((s) => s.deleteDoc);
  const createDoc = useProjectStore((s) => s.createDoc);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);
  const setMapOpen = useUiStore((s) => s.setMapOpen);
  const mapOpen = useUiStore((s) => s.mapOpen);
  const confirm = useUiStore((s) => s.confirm);
  const confirmDestructive = useSettingsStore((s) => s.settings.interface.confirmDestructive);
  const menu = useMenu();

  const [title, setTitle] = useState(doc.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentDocId = useRef(doc.id);

  // Adopt the stored name when the document changes, or when it is renamed
  // from somewhere else (the tree, the command palette).
  useEffect(() => {
    if (currentDocId.current !== doc.id) {
      currentDocId.current = doc.id;
      setTitle(doc.name);
      return;
    }
    if (document.activeElement !== inputRef.current) setTitle(doc.name);
  }, [doc.id, doc.name]);

  const commitTitle = () => {
    const next = title.trim();
    if (!next) {
      setTitle(doc.name);
      return;
    }
    if (next !== doc.name) updateDoc(doc.id, { name: next });
  };

  const entries: MenuEntry[] = [
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      onSelect: () => {
        const id = createDoc({
          kind: doc.kind,
          name: `${doc.name} copy`,
          folderId: doc.folderId,
          content: doc.content,
          tagIds: doc.tagIds,
        });
        useProjectStore.getState().updateDoc(id, { fields: doc.fields });
        setActiveDoc(id);
      },
    },
    { id: 's', separator: true },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      onSelect: async () => {
        const ok =
          !confirmDestructive ||
          (await confirm({
            title: `Delete “${doc.name}”?`,
            body: 'This cannot be undone.',
            detail: 'References elsewhere in your prose will show as unresolved.',
            confirmLabel: 'Delete',
            destructive: true,
          }));
        if (!ok) return;
        deleteDoc(doc.id);
        setActiveDoc(null);
      },
    },
  ];

  return (
    <header className="shrink-0 border-b border-[var(--color-line)] px-4 pt-2.5 pb-2 sm:px-6">
      <div className="flex items-center gap-2">
        <Tooltip label="Toggle library panel">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle library panel"
            onClick={() => toggleLeftPanel()}
            className="lg:hidden"
          >
            <PanelLeft size={14} />
          </Button>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {doc.kind === 'location' && (
            <Tooltip label={mapOpen ? 'Hide map' : 'Show map'}>
              <Button
                variant={mapOpen ? 'primary' : 'ghost'}
                size="icon-sm"
                aria-label="Toggle map"
                aria-pressed={mapOpen}
                onClick={() => setMapOpen(!mapOpen)}
              >
                <Map size={14} />
              </Button>
            </Tooltip>
          )}
          <Tooltip label="Focus mode · ⌘.">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Enter focus mode"
              onClick={() => setFocusMode(true)}
            >
              <Focus size={14} />
            </Button>
          </Tooltip>
          <Tooltip label="Toggle details panel">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle details panel"
              onClick={() => toggleRightPanel()}
            >
              <PanelRight size={14} />
            </Button>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Document actions"
            onClick={(event) => menu.openAt(event)}
          >
            <MoreHorizontal size={14} />
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        value={title}
        aria-label="Document title"
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
          if (event.key === 'Escape') setTitle(doc.name);
        }}
        className="mt-1.5 w-full bg-transparent font-[family-name:var(--font-prose)] text-[1.55rem] leading-tight font-semibold tracking-[-0.01em] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
        placeholder="Untitled"
      />

      <MenuHost anchor={menu.anchor} entries={entries} onClose={menu.close} align="end" />
    </header>
  );
}
