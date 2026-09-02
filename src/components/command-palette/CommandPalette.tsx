import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookText,
  CalendarClock,
  CornerDownLeft,
  FileText,
  Folder as FolderIcon,
  MapPin,
  Search,
  Tag as TagIcon,
  User,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore, type PaletteMode } from '@/store/uiStore';
import { useNavigation } from '@/hooks/useNavigation';
import { useProjectActions } from '@/hooks/useProjectActions';
import { buildCommands, type Command } from '@/features/search/commands';
import { searchProject, type SearchResult } from '@/features/search/searchProject';
import { fuzzyRank } from '@/utils/fuzzy';
import { cn } from '@/utils/cn';

const RESULT_ICON = {
  character: User,
  location: MapPin,
  note: FileText,
  folder: FolderIcon,
  event: CalendarClock,
  tag: TagIcon,
  chapter: BookText,
};

type Row =
  | { kind: 'command'; command: Command }
  | { kind: 'result'; result: SearchResult };

/**
 * One surface for both search and commands, opened with ⌘K.
 *
 * Typing searches the project; a leading `>` restricts the list to commands.
 * With an empty query it offers commands, which is what makes ⌘K useful as a
 * launcher rather than only as a finder.
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

  const [query, setQuery] = useState(seed);
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo(() => buildCommands(actions), [actions]);

  useEffect(() => {
    // Focus after paint so the portal is in the document.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const commandMode = mode === 'commands' || query.startsWith('>');
  const searchTerm = query.startsWith('>') ? query.slice(1).trim() : query.trim();

  const rows: Row[] = useMemo(() => {
    const commandRows: Row[] = (
      searchTerm
        ? fuzzyRank(
            searchTerm,
            commands,
            (command) => `${command.label} ${command.keywords ?? ''}`,
            10,
          ).map(({ item }) => item)
        : commands
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
  }, [searchTerm, commandMode, commands, bundle]);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  // Keep the highlighted row scrolled into view during keyboard navigation.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [index]);

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
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[0.86rem] text-[var(--color-ink)]">No matches found.</p>
              <p className="mt-1.5 text-[0.76rem] leading-relaxed text-[var(--color-ink-muted)]">
                Try a shorter query, search for a tag with <code>#</code>, or type{' '}
                <code>&gt;</code> to run a command instead.
              </p>
            </div>
          ) : (
            rows.map((row, rowIndex) => {
              const active = rowIndex === index;
              if (row.kind === 'command') {
                const Icon = row.command.icon;
                return (
                  <button
                    key={`command:${row.command.id}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-active={active}
                    onMouseEnter={() => setIndex(rowIndex)}
                    onClick={() => runRow(row)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                      active && 'bg-[var(--color-surface-raised)]',
                    )}
                  >
                    <Icon size={14} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
                    <span className="flex-1 truncate text-[0.84rem] text-[var(--color-ink)]">
                      {row.command.label}
                    </span>
                    <span className="text-[0.68rem] text-[var(--color-ink-faint)]">
                      {row.command.shortcut ?? row.command.group}
                    </span>
                  </button>
                );
              }

              const Icon = RESULT_ICON[row.result.type];
              return (
                <button
                  key={`result:${row.result.id}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-active={active}
                  onMouseEnter={() => setIndex(rowIndex)}
                  onClick={() => runRow(row)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-2 text-left transition-colors',
                    active && 'bg-[var(--color-surface-raised)]',
                  )}
                >
                  <Icon
                    size={14}
                    className="mt-0.5 shrink-0 text-[var(--color-ink-faint)]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-[0.84rem] text-[var(--color-ink)]">
                        {row.result.title}
                      </span>
                      <span className="shrink-0 text-[0.66rem] tracking-wide text-[var(--color-ink-faint)] uppercase">
                        {row.result.type}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[0.72rem] text-[var(--color-ink-faint)]">
                      {row.result.path}
                      {row.result.snippet ? ` — ${row.result.snippet}` : ''}
                    </span>
                  </span>
                  {active && (
                    <CornerDownLeft
                      size={12}
                      className="mt-1 shrink-0 text-[var(--color-ink-faint)]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
