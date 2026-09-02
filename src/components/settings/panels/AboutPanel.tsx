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
  ['Dexie', 'IndexedDB storage'],
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
          Projects, notes, characters, timelines and maps are stored entirely on this device, in
          this browser's own IndexedDB — nothing leaves it, and there's no server for this app to
          talk to. Clearing this browser's site data removes everything, with nothing to recover
          it from unless a backup was made first.
        </p>
        <p className="py-2 text-[0.81rem] leading-relaxed text-[var(--color-ink-muted)]">
          Data &amp; Storage can also connect a folder on disk, which the app keeps a periodic,
          human-readable backup in (markdown for text, SVG for maps) — worth setting up before any
          destructive action, and the easiest way to move a project to another device.
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
