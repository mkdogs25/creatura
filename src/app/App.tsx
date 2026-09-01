import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Loader2, Plus, Sparkles } from 'lucide-react';
import { openDatabase } from '@/db/database';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import { useEditorStore } from '@/store/editorStore';
import { persistence } from '@/store/persistence';
import {
  useKeyboardShortcuts,
  useResponsiveLayout,
  useUnsavedGuard,
} from '@/hooks/useKeyboardShortcuts';
import { useThemeEffect } from '@/hooks/useThemeEffect';
import { TopNav } from '@/components/navigation/TopNav';
import { WorldLibraryView } from '@/components/world-library/WorldLibraryView';
import { TimelineView } from '@/components/timeline/TimelineView';
import { MatrixView } from '@/components/matrix/MatrixView';
import { SettingsView } from '@/components/settings/SettingsView';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { MentionMenu } from '@/components/editor/MentionMenu';
import { ProjectDialog } from '@/components/onboarding/ProjectDialog';
import { WelcomeDialog } from '@/components/onboarding/WelcomeDialog';
import { ToastViewport } from '@/components/ui/Toast';
import { ConfirmDialogHost } from '@/components/ui/ConfirmDialog';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { buildDemoProject } from '@/data/seed/demoProject';

/**
 * Application root.
 *
 * Boot order matters: settings first (they carry the last-open project and the
 * theme), then the database, then the project bundle. Each view is wrapped in
 * its own error boundary so a failure in one cannot blank the whole studio.
 */
export function App() {
  const [booting, setBooting] = useState(true);
  const view = useUiStore((s) => s.view);
  const focusMode = useUiStore((s) => s.focusMode);

  useThemeEffect();
  useKeyboardShortcuts();
  useUnsavedGuard();
  useResponsiveLayout();

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const settings = await useSettingsStore.getState().load();

      const database = await openDatabase();
      if (!database.ok) {
        persistence.markOffline();
        useProjectStore.setState({
          dbReady: false,
          dbMessage: database.reason ?? null,
          loading: false,
        });
        useUiStore.getState().toast({
          tone: 'error',
          title: 'Local storage unavailable',
          body: database.reason,
          sticky: true,
        });
        if (!cancelled) setBooting(false);
        return;
      }

      await useProjectStore.getState().bootstrap();
      if (cancelled) return;

      // Apply the stored panel preferences once, on first paint.
      const ui = useUiStore.getState();
      if (!ui.isNarrow) {
        ui.toggleLeftPanel(settings.interface.sidebarDefaultOpen);
        ui.toggleRightPanel(settings.interface.metadataDefaultOpen);
      }

      if (!settings.onboardingComplete) ui.setOnboardingOpen(true);
      setBooting(false);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (booting) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="flex items-center gap-2.5 text-[0.84rem] text-[var(--color-ink-faint)]">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          Opening your library…
        </span>
      </div>
    );
  }

  return (
    <>
      {!focusMode && <TopNav />}

      <div className="flex min-h-0 flex-1 flex-col">
        <ErrorBoundary label="This view stopped responding">
          <ProjectGate>
            {view === 'library' && <WorldLibraryView />}
            {view === 'timeline' && <TimelineView />}
            {view === 'matrix' && <MatrixView />}
            {view === 'settings' && <SettingsView />}
          </ProjectGate>
        </ErrorBoundary>
      </div>

      <CommandPalette />
      <MentionMenu />
      <ProjectDialog />
      <WelcomeDialog />
      <ConfirmDialogHost />
      <ToastViewport />
    </>
  );
}

/**
 * Views other than Settings need a project. Rather than rendering broken
 * panels, offer the two ways forward.
 */
function ProjectGate({ children }: { children: React.ReactNode }) {
  const bundle = useProjectStore((s) => s.bundle);
  const loading = useProjectStore((s) => s.loading);
  const dbReady = useProjectStore((s) => s.dbReady);
  const dbMessage = useProjectStore((s) => s.dbMessage);
  const view = useUiStore((s) => s.view);
  const setProjectDialogOpen = useUiStore((s) => s.setProjectDialogOpen);
  const importBundle = useProjectStore((s) => s.importBundle);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);

  if (!dbReady && view !== 'settings') {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Local storage is unavailable."
        body={
          dbMessage ??
          'This browser will not let Creatura open its database, so nothing can be saved.'
        }
      >
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </EmptyState>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={16} className="animate-spin text-[var(--color-ink-faint)]" aria-hidden="true" />
      </div>
    );
  }

  if (!bundle && view !== 'settings') {
    return (
      <EmptyState
        icon={BookOpen}
        title="No project open."
        body="Creatura keeps each world in its own project. Start one, or explore the demo to see how the three views work together."
      >
        <Button variant="primary" onClick={() => setProjectDialogOpen(true)}>
          <Plus size={14} />
          New project
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            const demo = buildDemoProject();
            await importBundle(demo);
            setActiveDoc(demo.characters[0]?.id ?? null);
          }}
        >
          <Sparkles size={14} />
          Open demo project
        </Button>
      </EmptyState>
    );
  }

  return <>{children}</>;
}
