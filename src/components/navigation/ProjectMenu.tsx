import { useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Copy,
  Download,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { useEditorStore } from '@/store/editorStore';
import { useProjectActions } from '@/hooks/useProjectActions';
import { MenuHost, type MenuEntry } from '@/components/ui/Menu';
import { Button } from '@/components/ui/Button';

/** Project switcher and per-project actions, anchored in the header. */
export function ProjectMenu() {
  const projects = useProjectStore((s) => s.projects);
  const bundle = useProjectStore((s) => s.bundle);
  const openProject = useProjectStore((s) => s.openProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const archiveProject = useProjectStore((s) => s.archiveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const setProjectDialogOpen = useUiStore((s) => s.setProjectDialogOpen);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const confirm = useUiStore((s) => s.confirm);
  const toast = useUiStore((s) => s.toast);
  const actions = useProjectActions();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const current = bundle?.project ?? null;
  const active = projects.filter((project) => !project.archived);
  const archived = projects.filter((project) => project.archived);

  const entries: MenuEntry[] = [
    { id: 'h-projects', heading: 'Projects' },
    ...active.map<MenuEntry>((project) => ({
      id: project.id,
      label: project.name === current?.name ? `${project.name}  ✓` : project.name,
      onSelect: () => {
        setActiveDoc(null);
        void openProject(project.id);
      },
    })),
    ...(archived.length > 0
      ? [
          { id: 'h-archived', heading: 'Archived' } as MenuEntry,
          ...archived.map<MenuEntry>((project) => ({
            id: project.id,
            label: project.name,
            icon: Archive,
            onSelect: () => {
              setActiveDoc(null);
              void openProject(project.id);
            },
          })),
        ]
      : []),
    { id: 's1', separator: true },
    {
      id: 'new',
      label: 'New project…',
      icon: Plus,
      onSelect: () => setProjectDialogOpen(true),
    },
    { id: 'import', label: 'Import project…', icon: Upload, onSelect: actions.importProject },
    ...(current
      ? [
          { id: 's2', separator: true } as MenuEntry,
          { id: 'h-current', heading: current.name } as MenuEntry,
          {
            id: 'export',
            label: 'Export project',
            icon: Download,
            onSelect: actions.exportProject,
          } as MenuEntry,
          {
            id: 'duplicate',
            label: 'Duplicate project',
            icon: Copy,
            onSelect: async () => {
              const id = await duplicateProject(current.id);
              if (id) {
                toast({
                  tone: 'success',
                  title: 'Project duplicated',
                  body: 'The copy is fully independent of the original.',
                });
              }
            },
          } as MenuEntry,
          {
            id: 'archive',
            label: current.archived ? 'Restore from archive' : 'Archive project',
            icon: current.archived ? ArchiveRestore : Archive,
            onSelect: () => void archiveProject(current.id, !current.archived),
          } as MenuEntry,
          {
            id: 'delete',
            label: 'Delete project',
            icon: Trash2,
            destructive: true,
            onSelect: async () => {
              const ok = await confirm({
                title: `Delete “${current.name}”?`,
                body: 'Every note, character, location, event and map in it is removed.',
                detail:
                  'This cannot be undone. Export the project first if you might want it back.',
                confirmLabel: 'Delete permanently',
                destructive: true,
              });
              if (!ok) return;
              setActiveDoc(null);
              await deleteProject(current.id);
              toast({ tone: 'info', title: `Deleted “${current.name}”` });
            },
          } as MenuEntry,
        ]
      : []),
  ];

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        onClick={() => setAnchor(buttonRef.current?.getBoundingClientRect() ?? null)}
        className="max-w-[12rem] min-w-0"
      >
        <span className="truncate text-[var(--color-ink)]">
          {current?.name ?? 'No project'}
        </span>
        <ChevronDown size={13} className="shrink-0 opacity-60" />
      </Button>
      <MenuHost anchor={anchor} entries={entries} onClose={() => setAnchor(null)} />
    </>
  );
}
