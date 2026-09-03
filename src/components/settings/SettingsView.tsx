import { useEffect, useMemo } from 'react';
import { useUiStore } from '@/store/uiStore';
import {
  Database,
  Info,
  Keyboard,
  LayoutPanelLeft,
  type LucideIcon,
  Palette,
  PenLine,
  FolderCog,
  Shapes,
  Type,
} from 'lucide-react';
import { AppearanceSettings } from '@/components/settings/panels/AppearancePanel';
import { EditorPanel } from '@/components/settings/panels/EditorPanel';
import { WritingPanel } from '@/components/settings/panels/WritingPanel';
import { InterfacePanel } from '@/components/settings/panels/InterfacePanel';
import { ProjectsPanel } from '@/components/settings/panels/ProjectsPanel';
import { CategoriesPanel } from '@/components/settings/panels/CategoriesPanel';
import { DataPanel } from '@/components/settings/panels/DataPanel';
import { AboutPanel } from '@/components/settings/panels/AboutPanel';
import { ShortcutsPanel } from '@/components/settings/panels/ShortcutsPanel';
import { cn } from '@/utils/cn';

/** One entry in the settings sidebar — not to be confused with the domain
 * `Category` type (a document category like Characters or Locations), which
 * the "Categories" entry below manages. */
interface SettingsSectionEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  render: () => JSX.Element;
}

const CATEGORIES: SettingsSectionEntry[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    description: 'Theme, density and motion.',
    render: () => <AppearanceSettings />,
  },
  {
    id: 'editor',
    label: 'Editor',
    icon: Type,
    description: 'Typography and the writing surface.',
    render: () => <EditorPanel />,
  },
  {
    id: 'writing',
    label: 'Writing',
    icon: PenLine,
    description: 'Autosave, goals and text conventions.',
    render: () => <WritingPanel />,
  },
  {
    id: 'interface',
    label: 'Interface',
    icon: LayoutPanelLeft,
    description: 'Panels, tooltips and confirmations.',
    render: () => <InterfacePanel />,
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderCog,
    description: 'This project and its statistics.',
    render: () => <ProjectsPanel />,
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: Shapes,
    description: 'Document kinds and the input fields each one asks for.',
    render: () => <CategoriesPanel />,
  },
  {
    id: 'data',
    label: 'Data & Storage',
    icon: Database,
    description: 'Export, import and destructive actions.',
    render: () => <DataPanel />,
  },
  {
    id: 'shortcuts',
    label: 'Keyboard Shortcuts',
    icon: Keyboard,
    description: 'Every binding in one place.',
    render: () => <ShortcutsPanel />,
  },
  {
    id: 'about',
    label: 'About',
    icon: Info,
    description: 'Version, credits and privacy.',
    render: () => <AboutPanel />,
  },
];

/** A real settings screen: category navigation on the left, one panel at a time. */
export function SettingsView() {
  const activeId = useUiStore((s) => s.settingsCategory);
  const setActiveId = useUiStore((s) => s.setSettingsCategory);
  const active = useMemo(
    () => CATEGORIES.find((category) => category.id === activeId) ?? CATEGORIES[0],
    [activeId],
  );

  // Reset the scroll position when moving between categories.
  useEffect(() => {
    document.getElementById('creatura-settings-panel')?.scrollTo({ top: 0 });
  }, [activeId]);

  return (
    <div className="flex min-h-0 flex-1">
      <nav
        aria-label="Settings categories"
        className="scroll-thin w-[13.5rem] shrink-0 overflow-y-auto border-r border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-3 max-sm:w-[3.5rem]"
      >
        <h2 className="type-label mb-2 px-2 max-sm:sr-only">Settings</h2>
        <ul className="space-y-0.5">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = category.id === activeId;
            return (
              <li key={category.id}>
                <button
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveId(category.id)}
                  title={category.label}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left transition-colors max-sm:justify-center max-sm:px-0',
                    isActive
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)]',
                  )}
                >
                  <Icon size={15} className="shrink-0" aria-hidden="true" />
                  <span className="truncate text-[0.82rem] max-sm:sr-only">{category.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        id="creatura-settings-panel"
        className="scroll-thin min-w-0 flex-1 overflow-y-auto bg-[var(--color-canvas)]"
      >
        <div className="mx-auto max-w-2xl px-5 py-7 sm:px-8">
          <header className="mb-6">
            <h1 className="type-display text-[1.75rem] leading-none text-[var(--color-ink)]">
              {active.label}
            </h1>
            <p className="mt-1.5 text-[0.83rem] text-[var(--color-ink-muted)]">
              {active.description}
            </p>
          </header>
          {active.render()}
        </div>
      </div>
    </div>
  );
}
