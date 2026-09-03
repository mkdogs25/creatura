import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookText,
  CalendarClock,
  ChevronRight,
  Copy,
  CornerDownLeft,
  Cpu,
  ExternalLink,
  FileText,
  Folder as FolderIcon,
  Map as MapIcon,
  MapPin,
  PawPrint,
  Search,
  Shapes,
  Tag as TagIcon,
  Trash2,
  User,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore, type PaletteMode } from '@/store/uiStore';
import { docById, chapterById, orderedCategories } from '@/store/selectors';
import { useNavigation } from '@/hooks/useNavigation';
import { useProjectActions } from '@/hooks/useProjectActions';
import { buildCommands, type Command } from '@/features/search/commands';
import { searchProject, type SearchResult } from '@/features/search/searchProject';
import { fuzzyRank } from '@/utils/fuzzy';
import { cn } from '@/utils/cn';

const RESULT_ICON = {
  character: User,
  location: MapPin,
  creature: PawPrint,
  tech: Cpu,
  // A custom-category result's real icon varies by category; this is a
  // reasonable generic stand-in for the search list specifically.
  custom: Shapes,
  note: FileText,
  folder: FolderIcon,
  event: CalendarClock,
  tag: TagIcon,
  chapter: BookText,
};

/** Rendering order for the catalogue view — a deliberate order, not alphabetical. */
const GROUP_ORDER = ['Document', 'Create', 'Navigate', 'View', 'Settings', 'Project'];

type Row =
  | { kind: 'command'; command: Command }
  | { kind: 'result'; result: SearchResult };

/**
 * Actions scoped to whatever document or chapter is currently open — these
 * only make sense in context, so they're assembled here rather than living in
 * the static catalogue in commands.ts.
 */
function useContextualCommands(): Command[] {
  const bundle = useProjectStore((s) => s.bundle);
  const activeDocId = useEditorStore((s) => s.activeDocId);
  const activeChapterId = useEditorStore((s) => s.activeChapterId);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter);
  const mapOpen = useUiStore((s) => s.mapOpen);
  const setMapOpen = useUiStore((s) => s.setMapOpen);
  const confirm = useUiStore((s) => s.confirm);

  const doc = useMemo(() => docById(bundle, activeDocId), [bundle, activeDocId]);
  const chapter = useMemo(() => chapterById(bundle, activeChapterId), [bundle, activeChapterId]);

  return useMemo(() => {
    const list: Command[] = [];

    if (doc) {
      list.push({
        id: 'ctx-duplicate-doc',
        label: `Duplicate “${doc.name}”`,
        group: 'Document',
        icon: Copy,
        run: () => {
          const store = useProjectStore.getState();
          const id = store.createDoc({
            kind: doc.kind,
            name: `${doc.name} copy`,
            folderId: doc.folderId,
            content: doc.content,
            tagIds: doc.tagIds,
          });
          store.updateDoc(id, { fields: doc.fields });
          setActiveDoc(id);
        },
      });
      list.push({
        id: 'ctx-delete-doc',
        label: `Delete “${doc.name}”`,
        group: 'Document',
        icon: Trash2,
        run: async () => {
          const ok = await confirm({
            title: `Delete “${doc.name}”?`,
            body: 'This cannot be undone.',
            detail: 'References elsewhere in your prose will show as unresolved.',
            confirmLabel: 'Delete',
            destructive: true,
          });
          if (!ok) return;
          useProjectStore.getState().deleteDoc(doc.id);
          setActiveDoc(null);
        },
      });
      if (doc.kind === 'location') {
        list.push({
          id: 'ctx-toggle-map',
          label: mapOpen ? `Hide map for “${doc.name}”` : `Show map for “${doc.name}”`,
          group: 'Document',
          icon: MapIcon,
          keywords: 'create map',
          run: () => setMapOpen(!mapOpen),
        });
        list.push({
          id: 'ctx-open-map-tab',
          label: `Open “${doc.name}”'s map in a new tab`,
          group: 'Document',
          icon: ExternalLink,
          run: () =>
            window.open(`${window.location.pathname}?map=${doc.id}`, '_blank', 'noopener'),
        });
      }
    }

    if (chapter) {
      list.push({
        id: 'ctx-duplicate-chapter',
        label: `Duplicate “${chapter.title}”`,
        group: 'Document',
        icon: Copy,
        run: () => {
          const id = useProjectStore.getState().duplicateChapter(chapter.id);
          if (id) setActiveChapter(id);
        },
      });
      list.push({
        id: 'ctx-delete-chapter',
        label: `Delete “${chapter.title}”`,
        group: 'Document',
        icon: Trash2,
        run: async () => {
          const ok = await confirm({
            title: `Delete “${chapter.title}”?`,
            body: 'This cannot be undone.',
            confirmLabel: 'Delete',
            destructive: true,
          });
          if (!ok) return;
          useProjectStore.getState().deleteChapter(chapter.id);
          setActiveChapter(null);
        },
      });
    }

    return list;
  }, [doc, chapter, mapOpen, confirm, setActiveDoc, setActiveChapter, setMapOpen]);
}

/**
 * One surface for both search and commands, opened with ⌘K.
 *
 * Typing searches the project; a leading `>` restricts the list to commands.
 * With an empty query it offers the full command catalogue, grouped into
 * collapsible categories — which is what makes ⌘K useful as a launcher for
 * every feature in the app, not only as a finder.
 */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const mode = useUiStore((s) => s.paletteMode);
  const seed = useUiStore((s) => s.paletteSeed);

  // The body is mounted only while the palette is open, so its query state
  // lives exactly as long as the palette does. Clearing it in an effect
  // instead would leave the previous search on screen for a frame — long
  // enough to catch the first keystroke of the next search.
  if (!open) return null;
  return <PaletteBody key={`${mode}:${seed}`} mode={mode} seed={seed} />;
}

function PaletteBody({ mode, seed }: { mode: PaletteMode; seed: string }) {
  const close = useUiStore((s) => s.closePalette);
  const bundle = useProjectStore((s) => s.bundle);
  const { openEntity, openEvent } = useNavigation();
  const actions = useProjectActions();
  const contextualCommands = useContextualCommands();

  const [query, setQuery] = useState(seed);
  const [index, setIndex] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => orderedCategories(bundle), [bundle]);

  const catalogue = useMemo(
    () => [...contextualCommands, ...buildCommands({ ...actions, categories })],
    [contextualCommands, actions, categories],
  );

  useEffect(() => {
    // Focus after paint so the portal is in the document.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const commandMode = mode === 'commands' || query.startsWith('>');
  const searchTerm = query.startsWith('>') ? query.slice(1).trim() : query.trim();
  const browsing = !searchTerm;

  const rows: Row[] = useMemo(() => {
    const commandRows: Row[] = (
      searchTerm
        ? fuzzyRank(
            searchTerm,
            catalogue,
            (command) => `${command.label} ${command.keywords ?? ''}`,
            10,
          ).map(({ item }) => item)
        : catalogue.filter((command) => !collapsedGroups.has(command.group))
    ).map((command) => ({ kind: 'command', command }));

    if (commandMode) return commandRows;

    if (!searchTerm) return commandRows;

    const resultRows: Row[] = searchProject(bundle, searchTerm, 30).map((result) => ({
      kind: 'result',
      result,
    }));

    // Search results lead; a couple of matching commands follow so ⌘K can
    // still reach "Create Character" while you're typing a character's name.
    return [...resultRows, ...commandRows.slice(0, 4)];
  }, [searchTerm, commandMode, catalogue, bundle, collapsedGroups]);

  // Groups rendered in the browsing (empty-query) catalogue view — computed
  // from the unfiltered list so a collapsed group's header stays put to be
  // re-expanded, rather than disappearing along with its rows.
  const groupedCatalogue = useMemo(() => {
    if (!browsing) return [];
    const byGroup = new Map<string, Command[]>();
    for (const command of catalogue) {
      const list = byGroup.get(command.group) ?? [];
      list.push(command);
      byGroup.set(command.group, list);
    }
    return GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
      group,
      commands: byGroup.get(group)!,
    }));
  }, [browsing, catalogue]);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  // Keep the highlighted row scrolled into view during keyboard navigation.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const runRow = (row: Row) => {
    close();
    if (row.kind === 'command') {
      row.command.run();
      return;
    }
    const { result } = row;
    if (result.type === 'event') openEvent(result.id);
    else if (result.type === 'tag' || result.type === 'folder') {
      useUiStore.getState().setView('library');
    } else openEntity(result.id);
  };

  // A single command row, shared between the grouped catalogue view and the
  // flat search/result list — `rowIndex` is its position in `rows`, which is
  // what keyboard navigation and `data-active` key off of.
  const renderCommandRow = (command: Command, rowIndex: number) => {
    const active = rowIndex === index;
    const Icon = command.icon;
    return (
      <button
        key={`command:${command.id}`}
        type="button"
        role="option"
        aria-selected={active}
        data-active={active}
        onMouseEnter={() => setIndex(rowIndex)}
        onClick={() => runRow({ kind: 'command', command })}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
          active && 'bg-[var(--color-surface-raised)]',
        )}
      >
        <Icon size={14} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
        <span className="flex-1 truncate text-[0.84rem] text-[var(--color-ink)]">
          {command.label}
        </span>
        <span className="text-[0.68rem] text-[var(--color-ink-faint)]">
          {command.shortcut ?? command.group}
        </span>
      </button>
    );
  };

  const renderResultRow = (result: SearchResult, rowIndex: number) => {
    const active = rowIndex === index;
    const Icon = RESULT_ICON[result.type];
    return (
      <button
        key={`result:${result.id}`}
        type="button"
        role="option"
        aria-selected={active}
        data-active={active}
        onMouseEnter={() => setIndex(rowIndex)}
        onClick={() => runRow({ kind: 'result', result })}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-2 text-left transition-colors',
          active && 'bg-[var(--color-surface-raised)]',
        )}
      >
        <Icon size={14} className="mt-0.5 shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[0.84rem] text-[var(--color-ink)]">{result.title}</span>
            <span className="shrink-0 text-[0.66rem] tracking-wide text-[var(--color-ink-faint)] uppercase">
              {result.type}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[0.72rem] text-[var(--color-ink-faint)]">
            {result.path}
            {result.snippet ? ` — ${result.snippet}` : ''}
          </span>
        </span>
        {active && (
          <CornerDownLeft size={12} className="mt-1 shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
        )}
      </button>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-start justify-center p-4 pt-[12vh]">
      <div className="fixed inset-0 bg-black/45 animate-in" onClick={close} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        className="relative w-full max-w-xl overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] shadow-[var(--shadow-float)] animate-rise"
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-4">
          <Search size={15} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            role="combobox"
            aria-expanded="true"
            aria-controls="creatura-palette-list"
            aria-label="Search your project or run a command"
            placeholder="Search everything, or type > for commands…"
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setIndex((i) => (rows.length === 0 ? 0 : (i + 1) % rows.length));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setIndex((i) => (rows.length === 0 ? 0 : (i - 1 + rows.length) % rows.length));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const row = rows[index];
                if (row) runRow(row);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                close();
              }
            }}
            className="w-full bg-transparent py-3.5 text-[0.92rem] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
          />
          <kbd className="shrink-0 rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[0.62rem] text-[var(--color-ink-faint)]">
            esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id="creatura-palette-list"
          role="listbox"
          className="scroll-thin max-h-[52vh] overflow-y-auto py-1"
        >
          {rows.length === 0 && groupedCatalogue.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[0.86rem] text-[var(--color-ink)]">No matches found.</p>
              <p className="mt-1.5 text-[0.76rem] leading-relaxed text-[var(--color-ink-muted)]">
                Try a shorter query, search for a tag with <code>#</code>, or type{' '}
                <code>&gt;</code> to run a command instead.
              </p>
            </div>
          ) : browsing ? (
            // Catalogue view: every command, grouped into collapsible categories.
            (() => {
              let rowIndex = -1;
              return groupedCatalogue.map(({ group, commands: groupCommands }) => {
                const collapsed = collapsedGroups.has(group);
                return (
                  <div key={group}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      aria-expanded={!collapsed}
                      className="flex w-full items-center gap-1.5 px-4 py-1.5 text-left"
                    >
                      <ChevronRight
                        size={11}
                        className={cn(
                          'shrink-0 text-[var(--color-ink-faint)] transition-transform',
                          !collapsed && 'rotate-90',
                        )}
                        aria-hidden="true"
                      />
                      <span className="type-label">{group}</span>
                      <span className="text-[0.66rem] text-[var(--color-ink-faint)]">
                        {groupCommands.length}
                      </span>
                    </button>
                    {!collapsed &&
                      groupCommands.map((command) => {
                        rowIndex += 1;
                        return renderCommandRow(command, rowIndex);
                      })}
                  </div>
                );
              });
            })()
          ) : (
            rows.map((row, rowIndex) =>
              row.kind === 'command'
                ? renderCommandRow(row.command, rowIndex)
                : renderResultRow(row.result, rowIndex),
            )
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
