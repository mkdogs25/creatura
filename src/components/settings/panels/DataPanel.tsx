import { useEffect, useState } from 'react';
import { Download, Eraser, FileType, Printer, Trash2, Upload } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useEditorStore } from '@/store/editorStore';
import { useProjectActions } from '@/hooks/useProjectActions';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { Button } from '@/components/ui/Button';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { persistence } from '@/store/persistence';
import { relativeTime } from '@/utils/text';

export function DataPanel() {
  const bundle = useProjectStore((s) => s.bundle);
  const clearProject = useProjectStore((s) => s.clearProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const dbReady = useProjectStore((s) => s.dbReady);
  const dbMessage = useProjectStore((s) => s.dbMessage);
  const confirm = useUiStore((s) => s.confirm);
  const toast = useUiStore((s) => s.toast);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const lastExportAt = useSettingsStore((s) => s.settings.lastExportAt);
  const actions = useProjectActions();

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(persistence.getLastSavedAt());

  useEffect(() => {
    return persistence.subscribe((_status, savedAt) => setLastSavedAt(savedAt));
  }, []);

  return (
    <>
      <SettingsSection
        title="Storage"
        description="Creatura stores everything in a Supabase project. Every device that can reach it shares the same data."
      >
        <dl className="divide-y divide-[var(--color-line)] text-[0.8rem]">
          <div className="flex justify-between py-2">
            <dt className="text-[var(--color-ink-muted)]">Backend</dt>
            <dd className="text-[var(--color-ink)]">Supabase</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--color-ink-muted)]">Configuration</dt>
            <dd className={isSupabaseConfigured ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
              {isSupabaseConfigured ? 'Credentials set' : 'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--color-ink-muted)]">Database status</dt>
            <dd className={dbReady ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
              {dbReady ? 'Connected' : 'Unavailable'}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--color-ink-muted)]">Last save</dt>
            <dd className="text-[var(--color-ink)]">
              {lastSavedAt ? relativeTime(lastSavedAt) : 'No writes yet this session'}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--color-ink-muted)]">Last export</dt>
            <dd className="text-[var(--color-ink)]">
              {lastExportAt ? relativeTime(lastExportAt) : 'Never'}
            </dd>
          </div>
        </dl>
        {dbMessage && (
          <p className="mt-2 rounded-[var(--radius-control)] border border-[color-mix(in_oklab,var(--color-danger)_40%,transparent)] px-3 py-2 text-[0.76rem] leading-relaxed text-[var(--color-danger)]">
            {dbMessage}
          </p>
        )}
      </SettingsSection>

      <SettingsSection
        title="Backup"
        description="Export writes a single JSON file containing the entire project — folders, entries, timeline, maps and all."
      >
        <div className="flex flex-wrap gap-2 py-2">
          <Button variant="secondary" onClick={actions.exportProject} disabled={!bundle}>
            <Download size={14} />
            Export project
          </Button>
          <Button variant="secondary" onClick={actions.importProject}>
            <Upload size={14} />
            Import project file
          </Button>
          <Button
            variant="secondary"
            onClick={actions.exportManuscriptAsMarkdown}
            disabled={!bundle}
          >
            <FileType size={14} />
            Manuscript as Markdown
          </Button>
          <Button variant="secondary" onClick={actions.exportManuscriptAsPdf} disabled={!bundle}>
            <Printer size={14} />
            Manuscript as PDF
          </Button>
        </div>
        <p className="pt-2 text-[0.74rem] leading-relaxed text-[var(--color-ink-faint)]">
          Imported files are validated before anything is written, and always arrive as a new
          project — importing never overwrites what you already have.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Destructive actions"
        description="These cannot be undone. Export first."
      >
        <div className="flex flex-wrap gap-2 py-2">
          <Button
            variant="danger"
            disabled={!bundle}
            onClick={async () => {
              if (!bundle) return;
              const ok = await confirm({
                title: `Empty “${bundle.project.name}”?`,
                body: 'Every folder, entry, event, map and tag in this project is deleted.',
                detail: 'The project itself remains, but completely empty.',
                confirmLabel: 'Empty project',
                destructive: true,
              });
              if (!ok) return;
              setActiveDoc(null);
              await clearProject(bundle.project.id);
              toast({ tone: 'info', title: 'Project emptied' });
            }}
          >
            <Eraser size={14} />
            Clear current project
          </Button>

          <Button
            variant="danger"
            disabled={!bundle}
            onClick={async () => {
              if (!bundle) return;
              const ok = await confirm({
                title: `Delete “${bundle.project.name}”?`,
                body: 'The project and everything in it is removed from Supabase, for everyone who shares this database.',
                detail: 'This cannot be undone.',
                confirmLabel: 'Delete permanently',
                destructive: true,
              });
              if (!ok) return;
              setActiveDoc(null);
              await deleteProject(bundle.project.id);
              toast({ tone: 'info', title: 'Project deleted' });
            }}
          >
            <Trash2 size={14} />
            Delete current project
          </Button>
        </div>
      </SettingsSection>
    </>
  );
}
