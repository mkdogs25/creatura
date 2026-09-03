import { useRef, useState } from 'react';
import { useMemo } from 'react';
import {
  BookOpen,
  BookText,
  CalendarPlus,
  Cpu,
  FilePlus2,
  FileUp,
  FolderPlus,
  Grid3x3,
  MapPin,
  Menu as MenuIcon,
  Moon,
  Monitor,
  PawPrint,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
  Tag as TagIcon,
  Timer,
  User,
} from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useProjectActions } from '@/hooks/useProjectActions';
import { QuillMark } from '@/components/navigation/QuillMark';
import { ProjectMenu } from '@/components/navigation/ProjectMenu';
import { SaveIndicator } from '@/components/navigation/SaveIndicator';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { MenuHost, type MenuEntry } from '@/components/ui/Menu';
import { cn } from '@/utils/cn';
import type { ViewId } from '@/types/domain';

const BASE_VIEWS: Array<{ id: ViewId; label: string; icon: typeof BookOpen }> = [
  { id: 'library', label: 'World Library', icon: BookOpen },
  { id: 'timeline', label: 'Timeline Mapper', icon: Timer },
  { id: 'manuscript', label: 'Manuscript', icon: BookText },
];

const MATRIX_VIEW = { id: 'matrix' as ViewId, label: 'Matrix View', icon: Grid3x3 };

const THEME_ICON = { dark: Moon, light: Sun, system: Monitor };

/** The persistent application header. */
export function TopNav() {
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const openPalette = useUiStore((s) => s.openPalette);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const isNarrow = useUiStore((s) => s.isNarrow);
  const theme = useSettingsStore((s) => s.settings.appearance.theme);
  const showMatrixTab = useSettingsStore((s) => s.settings.interface.showMatrixTab);
  const actions = useProjectActions();

  const createRef = useRef<HTMLButtonElement>(null);
  const [createAnchor, setCreateAnchor] = useState<DOMRect | null>(null);

  const ThemeIcon = THEME_ICON[theme];
  const views = useMemo(
    () => (showMatrixTab ? [...BASE_VIEWS, MATRIX_VIEW] : BASE_VIEWS),
    [showMatrixTab],
  );

  const createEntries: MenuEntry[] = [
    { id: 'h', heading: 'Create' },
    { id: 'note', label: 'Note', icon: FilePlus2, onSelect: () => actions.createDoc('note') },
    {
      id: 'character',
      label: 'Character',
      icon: User,
      onSelect: () => actions.createDoc('character'),
    },
    {
      id: 'location',
      label: 'Location',
      icon: MapPin,
      onSelect: () => actions.createDoc('location'),
    },
    {
      id: 'creature',
      label: 'Creature',
      icon: PawPrint,
      onSelect: () => actions.createDoc('creature'),
    },
    {
      id: 'tech',
      label: 'Tech',
      icon: Cpu,
      onSelect: () => actions.createDoc('tech'),
    },
    {
      id: 'event',
      label: 'Timeline Event',
      icon: CalendarPlus,
      onSelect: actions.createEvent,
    },
    {
      id: 'chapter',
      label: 'Chapter',
      icon: BookText,
      onSelect: actions.createChapter,
    },
    { id: 'folder', label: 'Folder', icon: FolderPlus, onSelect: actions.createFolder },
    { id: 'tag', label: 'Tag', icon: TagIcon, onSelect: actions.createTag },
    { id: 's', separator: true },
    {
      id: 'import-markdown',
      label: 'Import markdown as notes…',
      icon: FileUp,
      onSelect: () => void actions.importMarkdownNotes(),
    },
  ];

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-2 sm:px-3">
      {isNarrow && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open library"
          onClick={() => toggleLeftPanel()}
        >
          <MenuIcon size={16} />
        </Button>
      )}

      <div className="flex shrink-0 items-center gap-2 pr-1">
        <span className="inline-flex text-[var(--color-accent)] transition-transform duration-300 ease-[var(--ease-out-soft)] hover:-rotate-6 hover:scale-110">
          <QuillMark size={19} />
        </span>
        <span className="type-display hidden text-[1.18rem] leading-none tracking-[0.09em] text-[var(--color-ink)] sm:inline">
          CREATURA
        </span>
      </div>

      <span className="hidden h-5 w-px bg-[var(--color-line)] sm:block" aria-hidden="true" />

      <ProjectMenu />

      <nav
        aria-label="Primary views"
        className="mx-auto flex items-center gap-0.5 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] p-0.5"
      >
        {views.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              // The label is hidden below md, so it cannot carry the name.
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => setView(item.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-1.5 text-[0.78rem] transition-colors',
                active
                  ? 'bg-[var(--color-surface-raised)] font-medium text-[var(--color-accent)] shadow-[var(--shadow-panel)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
              )}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="hidden md:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <span className="mr-1 hidden text-[0.7rem] lg:inline">
          <SaveIndicator />
        </span>

        <Tooltip label="Search & commands · ⌘K">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Search and commands"
            onClick={() => openPalette('all')}
          >
            <Search size={15} />
          </Button>
        </Tooltip>

        <Tooltip label="Create">
          <Button
            ref={createRef}
            variant="ghost"
            size="icon-sm"
            aria-label="Create"
            aria-haspopup="menu"
            onClick={() => setCreateAnchor(createRef.current?.getBoundingClientRect() ?? null)}
          >
            <Plus size={15} />
          </Button>
        </Tooltip>

        <Tooltip label={`Theme: ${theme}`}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Switch theme, currently ${theme}`}
            onClick={actions.toggleTheme}
          >
            <ThemeIcon size={15} />
          </Button>
        </Tooltip>

        <Tooltip label="Settings · ⌘,">
          <Button
            variant={view === 'settings' ? 'primary' : 'ghost'}
            size="icon-sm"
            aria-label="Settings"
            onClick={() => setView('settings')}
          >
            <SettingsIcon size={15} />
          </Button>
        </Tooltip>
      </div>

      <MenuHost
        anchor={createAnchor}
        entries={createEntries}
        onClose={() => setCreateAnchor(null)}
        align="end"
      />
    </header>
  );
}
