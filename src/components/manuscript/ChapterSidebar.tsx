import { useState } from 'react';
import { BookText, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { orderedChapters } from '@/store/selectors';
import { MenuHost, useMenu, type MenuEntry } from '@/components/ui/Menu';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatNumber } from '@/utils/text';
import { cn } from '@/utils/cn';
import type { ManuscriptChapter } from '@/types/domain';

/**
 * The manuscript's table of contents. Chapters are a flat, ordered list —
 * unlike the library there is no nesting — reordered by dragging, same
 * gesture as the folder tree.
 */
export function ChapterSidebar() {
  const bundle = useProjectStore((s) => s.bundle);
  const createChapter = useProjectStore((s) => s.createChapter);
  const reorderChapter = useProjectStore((s) => s.reorderChapter);
  const activeChapterId = useEditorStore((s) => s.activeChapterId);
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const chapters = orderedChapters(bundle);
  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);

  const addChapter = () => {
    const id = createChapter({ order: chapters.length });
    setActiveChapter(id);
    setRenaming(id);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <h2 className="type-label">Manuscript</h2>
        <Tooltip label="New chapter">
          <Button variant="ghost" size="icon-sm" aria-label="New chapter" onClick={addChapter}>
            <Plus size={14} />
          </Button>
        </Tooltip>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-1.5 pb-4">
        {chapters.length === 0 ? (
          <p className="px-2.5 py-6 text-[0.78rem] leading-relaxed text-[var(--color-ink-faint)]">
            No chapters yet. Start the first one.
          </p>
        ) : (
          <ul role="list" aria-label="Chapters" className="space-y-px">
            {chapters.map((chapter, index) => (
              <ChapterRow
                key={chapter.id}
                chapter={chapter}
                index={index}
                active={chapter.id === activeChapterId}
                onOpen={() => setActiveChapter(chapter.id)}
                renaming={renaming === chapter.id}
                setRenaming={setRenaming}
                dragging={dragging === chapter.id}
                isDropTarget={dropIndex === index}
                onDragStart={() => setDragging(chapter.id)}
                onDragEnd={() => {
                  setDragging(null);
                  setDropIndex(null);
                }}
                onDragOver={() => {
                  if (dragging && dragging !== chapter.id) setDropIndex(index);
                }}
                onDrop={() => {
                  if (dragging && dragging !== chapter.id) reorderChapter(dragging, index);
                  setDragging(null);
                  setDropIndex(null);
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {chapters.length > 0 && (
        <div className="shrink-0 border-t border-[var(--color-line)] px-3 py-2 text-[0.72rem] text-[var(--color-ink-faint)]">
          <span className="tabular-nums">{formatNumber(totalWords)}</span> words ·{' '}
          <span className="tabular-nums">{chapters.length}</span>{' '}
          {chapters.length === 1 ? 'chapter' : 'chapters'}
        </div>
      )}
    </div>
  );
}

interface ChapterRowProps {
  chapter: ManuscriptChapter;
  index: number;
  active: boolean;
  onOpen: () => void;
  renaming: boolean;
  setRenaming: (id: string | null) => void;
  dragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}

function ChapterRow({
  chapter,
  index,
  active,
  onOpen,
  renaming,
  setRenaming,
  dragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: ChapterRowProps) {
  const updateChapterTitle = useProjectStore((s) => s.updateChapterTitle);
  const deleteChapter = useProjectStore((s) => s.deleteChapter);
  const duplicateChapter = useProjectStore((s) => s.duplicateChapter);
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter);
  const confirm = useUiStore((s) => s.confirm);
  const confirmDestructive = useSettingsStore((s) => s.settings.interface.confirmDestructive);
  const menu = useMenu();

  const entries: MenuEntry[] = [
    { id: 'h', heading: chapter.title },
    { id: 'rename', label: 'Rename', icon: Pencil, onSelect: () => setRenaming(chapter.id) },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      onSelect: () => {
        const id = duplicateChapter(chapter.id);
        if (id) setActiveChapter(id);
      },
    },
    { id: 's', separator: true },
    {
      id: 'delete',
      label: 'Delete chapter',
      icon: Trash2,
      destructive: true,
      onSelect: async () => {
        const ok =
          !confirmDestructive ||
          (await confirm({
            title: `Delete “${chapter.title}”?`,
            body: 'This cannot be undone.',
            confirmLabel: 'Delete',
            destructive: true,
          }));
        if (!ok) return;
        deleteChapter(chapter.id);
        if (active) setActiveChapter(null);
      },
    },
  ];

  return (
    <li
      role="listitem"
      aria-selected={active}
      draggable
      onDragStart={(event) => {
        onDragStart();
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onContextMenu={menu.openAt}
      className={cn(
        'group flex items-center gap-1.5 rounded-[var(--radius-control)] pr-1.5 transition-colors',
        dragging && 'opacity-40',
        isDropTarget
          ? 'bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]'
          : active
            ? 'bg-[var(--color-accent-soft)]'
            : 'hover:bg-[var(--color-surface-raised)]',
      )}
    >
      <span className="w-5 shrink-0 text-center font-mono text-[0.65rem] text-[var(--color-ink-faint)] tabular-nums">
        {index + 1}
      </span>
      <BookText
        size={12}
        className={cn(
          'shrink-0',
          active ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-faint)]',
        )}
        aria-hidden="true"
      />
      {renaming ? (
        <input
          autoFocus
          defaultValue={chapter.title}
          aria-label="Rename chapter"
          onFocus={(event) => event.target.select()}
          onBlur={(event) => {
            const title = event.target.value.trim();
            if (title) updateChapterTitle(chapter.id, title);
            setRenaming(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              (event.target as HTMLInputElement).blur();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setRenaming(null);
            }
            event.stopPropagation();
          }}
          className="my-0.5 min-w-0 flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-surface-sunken)] px-1 py-0.5 text-[0.8rem] text-[var(--color-ink)] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onOpen}
          onDoubleClick={() => setRenaming(chapter.id)}
          className={cn(
            'flex-1 truncate py-[var(--row-py)] text-left text-[0.8rem]',
            active ? 'font-medium text-[var(--color-accent)]' : 'text-[var(--color-ink)]',
          )}
        >
          {chapter.title}
        </button>
      )}
      <span className="shrink-0 font-mono text-[0.63rem] text-[var(--color-ink-faint)] tabular-nums">
        {formatNumber(chapter.wordCount)}
      </span>
      <button
        type="button"
        aria-label={`Actions for ${chapter.title}`}
        onClick={(event) => menu.openAt(event)}
        className="shrink-0 rounded px-1 text-[var(--color-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        ⋯
      </button>
      <MenuHost anchor={menu.anchor} entries={entries} onClose={menu.close} />
    </li>
  );
}
