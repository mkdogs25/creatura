import { useState } from 'react';
import { BookOpen, Grid3x3, Sparkles, Timer, Upload } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useEditorStore } from '@/store/editorStore';
import { useProjectActions } from '@/hooks/useProjectActions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { QuillMark } from '@/components/navigation/QuillMark';
import { buildDemoProject } from '@/data/seed/demoProject';

const WORKSPACES = [
  {
    icon: BookOpen,
    title: 'World Library',
    body: 'Build your world and write your notes.',
  },
  {
    icon: Timer,
    title: 'Timeline Mapper',
    body: 'See your story unfold through time.',
  },
  {
    icon: Grid3x3,
    title: 'Matrix View',
    body: 'Discover where characters and locations intersect.',
  },
];

/**
 * First-run welcome. It appears once; after that the only way back is the
 * About section in Settings, because nothing is more irritating than an
 * onboarding screen that will not stay closed.
 */
export function WelcomeDialog() {
  const open = useUiStore((s) => s.onboardingOpen);
  const setOpen = useUiStore((s) => s.setOnboardingOpen);
  const setProjectDialogOpen = useUiStore((s) => s.setProjectDialogOpen);
  const setView = useUiStore((s) => s.setView);
  const toast = useUiStore((s) => s.toast);
  const updateSettings = useSettingsStore((s) => s.update);
  const importBundle = useProjectStore((s) => s.importBundle);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const { importProject } = useProjectActions();
  const [busy, setBusy] = useState(false);

  const finish = () => {
    updateSettings('onboardingComplete', true);
    setOpen(false);
  };

  const loadDemo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const demo = buildDemoProject();
      await importBundle(demo);
      setActiveDoc(demo.characters[0]?.id ?? null);
      setView('library');
      finish();
      toast({
        tone: 'success',
        title: 'Demo project opened',
        body: 'Tidewrack is an ordinary project — edit or delete it freely.',
      });
    } finally {
      setBusy(false);
    }
  };

  const importExisting = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Cancelling the file picker or an invalid file both resolve false —
      // either way the welcome screen should stay put rather than vanish.
      const imported = await importProject();
      if (imported) finish();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={finish} size="lg" hideClose>
      <div className="px-1 py-2 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface-sunken)] text-[var(--color-accent)]">
          <QuillMark size={22} />
        </span>
        <h1 className="type-display text-[2rem] leading-none tracking-[0.08em] text-[var(--color-ink)]">
          CREATURA
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[0.85rem] leading-relaxed text-[var(--color-ink-muted)]">
          A story bible, a chronology and a quiet place to write — sharing one world, stored
          entirely on this device.
        </p>

        <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
          {WORKSPACES.map((workspace) => {
            const Icon = workspace.icon;
            return (
              <div
                key={workspace.title}
                className="rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3.5"
              >
                <Icon size={16} className="mb-2 text-[var(--color-accent)]" aria-hidden="true" />
                <h2 className="type-display text-[1.05rem] leading-tight text-[var(--color-ink)]">
                  {workspace.title}
                </h2>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--color-ink-muted)]">
                  {workspace.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              finish();
              setProjectDialogOpen(true);
            }}
          >
            Create your first project
          </Button>
          <Button variant="secondary" size="lg" onClick={loadDemo} disabled={busy}>
            <Sparkles size={14} />
            Open demo project
          </Button>
          <Button variant="secondary" size="lg" onClick={importExisting} disabled={busy}>
            <Upload size={14} />
            Import a project file
          </Button>
          <Button variant="ghost" size="lg" onClick={finish}>
            Skip
          </Button>
        </div>
      </div>
    </Modal>
  );
}
