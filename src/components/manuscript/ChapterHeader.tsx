import { useEffect, useRef, useState } from 'react';
import { Copy, Focus, MoreHorizontal, PanelLeft, PanelRight, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { MenuHost, useMenu, type MenuEntry } from '@/components/ui/Menu';
import type { ManuscriptChapter } from '@/types/domain';

/** Title and per-chapter actions above the writing surface. */
export function ChapterHeader({ chapter }: { chapter: ManuscriptChapter }) {
  const updateChapterTitle = useProjectStore((s) => s.updateChapterTitle);
  const deleteChapter = useProjectStore((s) => s.deleteChapter);
  const duplicateChapter = useProjectStore((s) => s.duplicateChapter);
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);
  const confirm = useUiStore((s) => s.confirm);
  const confirmDestructive = useSettingsStore((s) => s.settings.interface.confirmDestructive);
  const menu = useMenu();

  const [title, setTitle] = useState(chapter.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentChapterId = useRef(chapter.id);

  useEffect(() => {
    if (currentChapterId.current !== chapter.id) {
      currentChapterId.current = chapter.id;
      setTitle(chapter.title);
      return;
    }
    if (document.activeElement !== inputRef.current) setTitle(chapter.title);
  }, [chapter.id, chapter.title]);

  const commitTitle = () => {
    const next = title.trim();
    if (!next) {
      setTitle(chapter.title);
      return;
    }
    if (next !== chapter.title) updateChapterTitle(chapter.id, next);
  };

  const entries: MenuEntry[] = [
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
      label: 'Delete',
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
        setActiveChapter(null);
      },
    },
  ];

  return (
    <header className="shrink-0 border-b border-[var(--color-line)] px-4 pt-2.5 pb-2 sm:px-6">
      <div className="flex items-center gap-2">
        <Tooltip label="Toggle chapter list">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle chapter list"
            onClick={() => toggleLeftPanel()}
            className="lg:hidden"
          >
            <PanelLeft size={14} />
          </Button>
        </Tooltip>
        <span className="type-label min-w-0 flex-1 truncate">Manuscript</span>
        <div className="flex shrink-0 items-center gap-0.5">
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
            aria-label="Chapter actions"
            onClick={(event) => menu.openAt(event)}
          >
            <MoreHorizontal size={14} />
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        value={title}
        aria-label="Chapter title"
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
          if (event.key === 'Escape') setTitle(chapter.title);
        }}
        className="mt-1.5 w-full bg-transparent font-[family-name:var(--font-prose)] text-[1.55rem] leading-tight font-semibold tracking-[-0.01em] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
        placeholder="Untitled chapter"
      />

      <MenuHost anchor={menu.anchor} entries={entries} onClose={menu.close} align="end" />
    </header>
  );
}
