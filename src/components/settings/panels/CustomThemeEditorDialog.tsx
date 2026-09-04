import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Input';
import { useSettingsStore } from '@/store/settingsStore';
import type { CustomThemeColors } from '@/types/domain';

const GROUPS: Array<{ title: string; fields: Array<keyof CustomThemeColors> }> = [
  { title: 'Backgrounds', fields: ['canvas', 'surface', 'surfaceRaised', 'surfaceSunken', 'overlay'] },
  { title: 'Borders', fields: ['line', 'lineStrong'] },
  { title: 'Text', fields: ['ink', 'inkMuted', 'inkFaint'] },
  { title: 'Accent', fields: ['accent', 'accentSoft', 'accentInk'] },
  { title: 'Status', fields: ['danger', 'success', 'grammar'] },
];

const FIELD_LABELS: Record<keyof CustomThemeColors, string> = {
  canvas: 'Canvas',
  surface: 'Surface',
  surfaceRaised: 'Surface, raised',
  surfaceSunken: 'Surface, sunken',
  overlay: 'Overlay',
  line: 'Line',
  lineStrong: 'Line, strong',
  ink: 'Ink',
  inkMuted: 'Ink, muted',
  inkFaint: 'Ink, faint',
  accent: 'Accent',
  accentSoft: 'Accent, soft',
  accentInk: 'Accent, ink',
  danger: 'Danger',
  success: 'Success',
  grammar: 'Grammar',
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Edits a single custom theme's colors. Every change applies immediately —
 * the theme being edited is already the active one, so the whole app
 * previews the edit live, and there is no separate save step.
 */
export function CustomThemeEditorDialog({
  themeId,
  onClose,
}: {
  themeId: string | null;
  onClose: () => void;
}) {
  const appearance = useSettingsStore((s) => s.settings.appearance);
  const update = useSettingsStore((s) => s.update);
  const theme = appearance.customThemes.find((t) => t.id === themeId) ?? null;

  function patch(changes: Partial<{ name: string; colors: Partial<CustomThemeColors> }>) {
    if (!theme) return;
    const next = appearance.customThemes.map((t) =>
      t.id === theme.id
        ? {
            ...t,
            ...(changes.name !== undefined ? { name: changes.name } : null),
            ...(changes.colors ? { colors: { ...t.colors, ...changes.colors } } : null),
            updatedAt: Date.now(),
          }
        : t,
    );
    update('appearance', { customThemes: next });
  }

  return (
    <Modal
      open={Boolean(theme)}
      onClose={onClose}
      title="Edit custom theme"
      description="Changes preview across the whole app immediately."
      size="lg"
    >
      {theme && (
        <div className="flex flex-col gap-5">
          <Field label="Name">
            <Input
              value={theme.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="My theme"
              maxLength={60}
            />
          </Field>

          {GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h3 className="text-[0.72rem] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
                {group.title}
              </h3>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {group.fields.map((field) => {
                  const value = theme.colors[field];
                  return (
                    <label
                      key={field}
                      className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] px-2 py-1.5"
                    >
                      <input
                        type="color"
                        value={HEX_PATTERN.test(value) ? value : '#808080'}
                        onChange={(e) => patch({ colors: { [field]: e.target.value } })}
                        className="h-6 w-6 shrink-0 cursor-pointer rounded border border-[var(--color-line)] bg-transparent p-0"
                        aria-label={FIELD_LABELS[field]}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.72rem] text-[var(--color-ink-muted)]">
                          {FIELD_LABELS[field]}
                        </span>
                        <input
                          value={value}
                          onChange={(e) => patch({ colors: { [field]: e.target.value } })}
                          className="w-full bg-transparent text-[0.72rem] text-[var(--color-ink)] focus:outline-none"
                          spellCheck={false}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
