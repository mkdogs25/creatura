import { useCallback, useMemo, useState } from 'react';
import {
  ChevronRight,
  FilePlus2,
  FileText,
  FileUp,
  FolderPlus,
  MapPin,
  Pencil,
  Trash2,
  User,
  CornerUpLeft,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useProjectActions } from '@/hooks/useProjectActions';
import {
  allDocs,
  childFolders,
  docsInFolder,
  folderItemCount,
} from '@/store/selectors';
import type { AnyDoc, DocKind, Folder } from '@/types/domain';
import { folderIcon } from '@/components/world-library/folderIcons';
import { MenuHost, useMenu, type MenuEntry } from '@/components/ui/Menu';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';

const DOC_ICON = { character: User, location: MapPin, note: FileText };

interface DragPayload {
  type: 'doc' | 'folder';
  id: string;
}

/**
 * The library's directory. Folders nest arbitrarily; documents live inside
 * them or at the project root, and both can be reordered by dragging.
 */
export function FolderTree() {
  const bundle = useProjectStore((s) => s.bundle);
  const createFolder = useProjectStore((s) => s.createFolder);
  const createDoc = useProjectStore((s) => s.createDoc);
  const activeDocId = useEditorStore((s) => s.activeDocId);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const defaultKind = useSettingsStore((s) => s.settings.writing.defaultDocKind);
  const { importMarkdownNotes } = useProjectActions();
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const rootFolders = useMemo(() => childFolders(bundle, null), [bundle]);
  const rootDocs = useMemo(() => docsInFolder(bundle, null), [bundle]);
  const isEmpty = rootFolders.length === 0 && allDocs(bundle).length === 0;

  const handleDrop = useCallback(
    (folderId: string | null) => {
      if (!dragging) return;
      const store = useProjectStore.getState();
      if (dragging.type === 'doc') store.moveDoc(dragging.id, folderId);
      else store.moveFolder(dragging.id, folderId);
      setDragging(null);
      setDropTarget(null);
    },
    [dragging],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <h2 className="type-label">Library</h2>
        <div className="flex items-center gap-0.5">
          <Tooltip label="New folder">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New folder"
              onClick={() => setRenaming(createFolder({}))}
            >
              <FolderPlus size={14} />
            </Button>
          </Tooltip>
          <Tooltip label="New note">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New note"
              onClick={() => setActiveDoc(createDoc({ kind: defaultKind }))}
            >
              <FilePlus2 size={14} />
            </Button>
          </Tooltip>
          <Tooltip label="Import markdown as notes">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Import markdown files as notes"
              onClick={() => void importMarkdownNotes(null)}
            >
              <FileUp size={14} />
            </Button>
          </Tooltip>
        </div>
      </header>

      <div
        className={cn(
          'scroll-thin flex-1 overflow-y-auto px-1.5 pb-4',
          dropTarget === '__root__' && 'bg-[var(--color-accent-soft)]',
        )}
        onDragOver={(event) => {
          if (!dragging) return;
          event.preventDefault();
          setDropTarget('__root__');
        }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop(null);
        }}
      >
        {isEmpty ? (
          <p className="px-2.5 py-6 text-[0.78rem] leading-relaxed text-[var(--color-ink-faint)]">
            This library is empty. Create a folder or a note to begin.
          </p>
        ) : (
          <ul role="tree" aria-label="Project contents" className="space-y-px">
            {rootFolders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                depth={0}
                dragging={dragging}
                setDragging={setDragging}
                dropTarget={dropTarget}
                setDropTarget={setDropTarget}
                onDrop={handleDrop}
                renaming={renaming}
                setRenaming={setRenaming}
              />
            ))}
            {rootDocs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                depth={0}
                active={doc.id === activeDocId}
                setDragging={setDragging}
                renaming={renaming}
                setRenaming={setRenaming}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface FolderRowProps {
  folder: Folder;
  depth: number;
  dragging: DragPayload | null;
  setDragging: (payload: DragPayload | null) => void;
  dropTarget: string | null;
  setDropTarget: (id: string | null) => void;
  onDrop: (folderId: string | null) => void;
  renaming: string | null;
  setRenaming: (id: string | null) => void;
}

function FolderRow({
  folder,
  depth,
  dragging,
  setDragging,
  dropTarget,
  setDropTarget,
  onDrop,
  renaming,
  setRenaming,
}: FolderRowProps) {
  const bundle = useProjectStore((s) => s.bundle);
  const updateFolder = useProjectStore((s) => s.updateFolder);
  const deleteFolder = useProjectStore((s) => s.deleteFolder);
  const createDoc = useProjectStore((s) => s.createDoc);
  const createFolder = useProjectStore((s) => s.createFolder);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const activeDocId = useEditorStore((s) => s.activeDocId);
  const confirm = useUiStore((s) => s.confirm);
  const confirmDestructive = useSettingsStore((s) => s.settings.interface.confirmDestructive);
  const { importMarkdownNotes } = useProjectActions();
  const menu = useMenu();

  const children = useMemo(() => childFolders(bundle, folder.id), [bundle, folder.id]);
  const docs = useMemo(() => docsInFolder(bundle, folder.id), [bundle, folder.id]);
  const count = useMemo(() => folderItemCount(bundle, folder.id), [bundle, folder.id]);
  const Icon = folderIcon(folder.icon);
  const expanded = !folder.collapsed;

  const addDoc = (kind: DocKind) => {
    const id = createDoc({ kind, folderId: folder.id });
    updateFolder(folder.id, { collapsed: false });
    setActiveDoc(id);
  };

  const entries: MenuEntry[] = [
    { id: 'h', heading: folder.name },
    {
      id: 'note',
      label: 'New note here',
      icon: FileText,
      onSelect: () => addDoc('note'),
    },
    {
      id: 'character',
      label: 'New character here',
      icon: User,
      onSelect: () => addDoc('character'),
    },
    {
      id: 'location',
      label: 'New location here',
      icon: MapPin,
      onSelect: () => addDoc('location'),
    },
    {
      id: 'subfolder',
      label: 'New subfolder',
      icon: FolderPlus,
      onSelect: () => {
        const id = createFolder({ parentId: folder.id, defaultKind: folder.defaultKind });
        updateFolder(folder.id, { collapsed: false });
        setRenaming(id);
      },
    },
    {
      id: 'import-markdown',
      label: 'Import markdown notes here',
      icon: FileUp,
      onSelect: () => {
        updateFolder(folder.id, { collapsed: false });
        void importMarkdownNotes(folder.id);
      },
    },
    { id: 's1', separator: true },
    { id: 'rename', label: 'Rename', icon: Pencil, onSelect: () => setRenaming(folder.id) },
    ...(folder.parentId
      ? [
          {
            id: 'unnest',
            label: 'Move to top level',
            icon: CornerUpLeft,
            onSelect: () => useProjectStore.getState().moveFolder(folder.id, null),
          } as MenuEntry,
        ]
      : []),
    { id: 's2', separator: true },
    {
      id: 'delete',
      label: 'Delete folder',
      icon: Trash2,
      destructive: true,
      onSelect: async () => {
        const ok =
          !confirmDestructive ||
          (await confirm({
            title: `Delete “${folder.name}”?`,
            body: 'Subfolders are removed too.',
            detail:
              'Documents inside are kept — they move to the top level of the library rather than being deleted.',
            confirmLabel: 'Delete folder',
            destructive: true,
          }));
        if (ok) deleteFolder(folder.id);
      },
    },
  ];

  const isDropTarget = dropTarget === folder.id;

  return (
    <li role="treeitem" aria-expanded={expanded}>
      <div
        draggable
        onDragStart={(event) => {
          event.stopPropagation();
          setDragging({ type: 'folder', id: folder.id });
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setDragging(null)}
        onDragOver={(event) => {
          if (!dragging || (dragging.type === 'folder' && dragging.id === folder.id)) return;
          event.preventDefault();
          event.stopPropagation();
          setDropTarget(folder.id);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDrop(folder.id);
        }}
        onContextMenu={menu.openAt}
        className={cn(
          'group flex items-center gap-1 rounded-[var(--radius-control)] pr-1.5 transition-colors',
          isDropTarget
            ? 'bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]'
            : 'hover:bg-[var(--color-surface-raised)]',
        )}
        style={{ paddingLeft: `${depth * 12 + 2}px` }}
      >
        <button
          type="button"
          aria-label={expanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
          onClick={() => updateFolder(folder.id, { collapsed: expanded })}
          className="flex h-6 w-5 shrink-0 items-center justify-center text-[var(--color-ink-faint)] transition-transform"
        >
          <ChevronRight
            size={12}
            className={cn('transition-transform duration-150', expanded && 'rotate-90')}
          />
        </button>
        <Icon size={13} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
        {renaming === folder.id ? (
          <InlineRename
            value={folder.name}
            onCommit={(name) => {
              if (name) updateFolder(folder.id, { name });
              setRenaming(null);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => updateFolder(folder.id, { collapsed: expanded })}
            onDoubleClick={() => setRenaming(folder.id)}
            className="flex-1 truncate py-[var(--row-py)] text-left text-[0.8rem] text-[var(--color-ink)]"
          >
            {folder.name}
          </button>
        )}
        <span className="shrink-0 font-mono text-[0.65rem] text-[var(--color-ink-faint)] tabular-nums">
          {count > 0 ? count : ''}
        </span>
        <button
          type="button"
          aria-label={`Actions for ${folder.name}`}
          onClick={(event) => menu.openAt(event)}
          className="shrink-0 rounded px-1 text-[var(--color-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          ⋯
        </button>
      </div>

      {expanded && (children.length > 0 || docs.length > 0) && (
        <ul role="group" className="space-y-px">
          {children.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              depth={depth + 1}
              dragging={dragging}
              setDragging={setDragging}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onDrop={onDrop}
              renaming={renaming}
              setRenaming={setRenaming}
            />
          ))}
          {docs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              depth={depth + 1}
              active={doc.id === activeDocId}
              setDragging={setDragging}
              renaming={renaming}
              setRenaming={setRenaming}
            />
          ))}
        </ul>
      )}
      <MenuHost anchor={menu.anchor} entries={entries} onClose={menu.close} />
    </li>
  );
}

interface DocRowProps {
  doc: AnyDoc;
  depth: number;
  active: boolean;
  setDragging: (payload: DragPayload | null) => void;
  renaming: string | null;
  setRenaming: (id: string | null) => void;
}

function DocRow({ doc, depth, active, setDragging, renaming, setRenaming }: DocRowProps) {
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const updateDoc = useProjectStore((s) => s.updateDoc);
  const deleteDoc = useProjectStore((s) => s.deleteDoc);
  const confirm = useUiStore((s) => s.confirm);
  const confirmDestructive = useSettingsStore((s) => s.settings.interface.confirmDestructive);
  const menu = useMenu();
  const Icon = DOC_ICON[doc.kind];

  const entries: MenuEntry[] = [
    { id: 'h', heading: doc.name },
    { id: 'open', label: 'Open', icon: FileText, onSelect: () => setActiveDoc(doc.id) },
    { id: 'rename', label: 'Rename', icon: Pencil, onSelect: () => setRenaming(doc.id) },
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
            detail:
              'References to it elsewhere in your prose will remain, shown as unresolved.',
            confirmLabel: 'Delete',
            destructive: true,
          }));
        if (!ok) return;
        deleteDoc(doc.id);
        if (active) setActiveDoc(null);
      },
    },
  ];

  return (
    <li role="treeitem" aria-selected={active}>
      <div
        draggable
        onDragStart={(event) => {
          event.stopPropagation();
          setDragging({ type: 'doc', id: doc.id });
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setDragging(null)}
        onContextMenu={menu.openAt}
        className={cn(
          'group flex items-center gap-1.5 rounded-[var(--radius-control)] pr-1.5 transition-colors',
          active
            ? 'bg-[var(--color-accent-soft)]'
            : 'hover:bg-[var(--color-surface-raised)]',
        )}
        style={{ paddingLeft: `${depth * 12 + 22}px` }}
      >
        <Icon
          size={12}
          className={cn(
            'shrink-0',
            active ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-faint)]',
          )}
          aria-hidden="true"
        />
        {renaming === doc.id ? (
          <InlineRename
            value={doc.name}
            onCommit={(name) => {
              if (name) updateDoc(doc.id, { name });
              setRenaming(null);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setActiveDoc(doc.id)}
            onDoubleClick={() => setRenaming(doc.id)}
            className={cn(
              'flex-1 truncate py-[var(--row-py)] text-left text-[0.8rem]',
              active
                ? 'font-medium text-[var(--color-accent)]'
                : 'text-[var(--color-ink-muted)]',
            )}
          >
            {doc.name}
          </button>
        )}
        <button
          type="button"
          aria-label={`Actions for ${doc.name}`}
          onClick={(event) => menu.openAt(event)}
          className="shrink-0 rounded px-1 text-[var(--color-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          ⋯
        </button>
      </div>
      <MenuHost anchor={menu.anchor} entries={entries} onClose={menu.close} />
    </li>
  );
}

function InlineRename({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (name: string | null) => void;
}) {
  return (
    <input
      autoFocus
      defaultValue={value}
      aria-label="Rename"
      onFocus={(event) => event.target.select()}
      onBlur={(event) => onCommit(event.target.value.trim())}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onCommit((event.target as HTMLInputElement).value.trim());
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onCommit(null);
        }
        event.stopPropagation();
      }}
      className="my-0.5 min-w-0 flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-surface-sunken)] px-1 py-0.5 text-[0.8rem] text-[var(--color-ink)] outline-none"
    />
  );
}
