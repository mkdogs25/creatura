import { useUiStore } from '@/store/uiStore';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { Button } from '@/components/ui/Button';
import { QuillMark } from '@/components/navigation/QuillMark';
import { APP_VERSION } from '@/app/version';
import { SCHEMA_VERSION } from '@/types/domain';

const CREDITS: Array<[string, string]> = [
  ['React + TypeScript', 'Application framework'],
  ['Vite', 'Build tooling'],
  ['Tailwind CSS', 'Design tokens and styling'],
  ['Tiptap / ProseMirror', 'Rich text editing'],
  ['Supabase', 'Postgres database'],
  ['Zustand', 'State management'],
  ['Zod', 'Schema validation'],
  ['Lucide', 'Interface icons'],
];

export function AboutPanel() {
  const setOnboardingOpen = useUiStore((s) => s.setOnboardingOpen);

  return (
    <>
      <SettingsSection title="Creatura">
        <div className="flex items-start gap-4 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] text-[var(--color-accent)]">
            <QuillMark size={22} />
          </span>
          <div>
            <p className="type-display text-[1.35rem] leading-none tracking-[0.08em] text-[var(--color-ink)]">
              CREATURA
            </p>
            <p className="mt-1 text-[0.78rem] text-[var(--color-ink-muted)]">
              Visual story bible, timeline mapper and minimalist writer.
            </p>
            <p className="mt-1.5 font-mono text-[0.72rem] text-[var(--color-ink-faint)]">
              Version {APP_VERSION} · project schema {SCHEMA_VERSION}
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Privacy">
        <p className="py-2 text-[0.81rem] leading-relaxed text-[var(--color-ink-muted)]">
          Projects, notes, characters, timelines and maps are stored in a Supabase project — a
          Postgres database this app talks to directly, not a third-party analytics or tracking
          service. There are no accounts yet, which means anyone with access to that database's
          credentials can read and write everything in it; treat the connection details
          accordingly.
        </p>
        <p className="py-2 text-[0.81rem] leading-relaxed text-[var(--color-ink-muted)]">
          Export a copy from Data &amp; Storage whenever you want a local backup you control —
          worth doing before any destructive action, since deleting a project removes it from the
          shared database for everyone who uses it.
        </p>
      </SettingsSection>

      <SettingsSection title="Built with">
        <dl className="text-[0.8rem]">
          {CREDITS.map(([name, role]) => (
            <div key={name} className="flex items-center justify-between gap-4 py-1.5">
              <dt className="text-[var(--color-ink)]">{name}</dt>
              <dd className="text-[var(--color-ink-faint)]">{role}</dd>
            </div>
          ))}
        </dl>
      </SettingsSection>

      <SettingsSection title="Getting started">
        <div className="py-2">
          <Button variant="secondary" onClick={() => setOnboardingOpen(true)}>
            Show the welcome screen again
          </Button>
        </div>
      </SettingsSection>
    </>
  );
}
