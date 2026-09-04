import { useState } from 'react';
import { Blend, Circle, Flower2, Monitor, Moon, Pencil, Plus, Sun, Trash2, Zap } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { CustomThemeEditorDialog } from '@/components/settings/panels/CustomThemeEditorDialog';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { CUSTOM_THEME_VARS } from '@/hooks/useThemeEffect';
import { cn } from '@/utils/cn';
import type { CustomTheme, CustomThemeColors, Density, ThemeMode, VisualMode } from '@/types/domain';

const THEMES: Array<{ id: ThemeMode; label: string; icon: typeof Moon }> = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
];

const VISUAL_MODES: Array<{ id: VisualMode; label: string; hint: string; icon: typeof Zap }> = [
  { id: 'natural', label: 'Natural', hint: 'The theme above, as designed.', icon: Sun },
  { id: 'cyberpunk', label: 'Neon Cyberpunk', hint: 'High-contrast neon on black.', icon: Zap },
  { id: 'pastel', label: 'Pastel', hint: 'Soft, muted tones.', icon: Flower2 },
  { id: 'monochrome', label: 'Monochromatic', hint: 'Near-grayscale throughout.', icon: Circle },
  {
    id: 'hueShift',
    label: 'Hue Shift on Collision',
    hint: 'Natural colors, plus a Map Builder effect where overlapping terrain drifts in hue.',
    icon: Blend,
  },
];

const DENSITIES: Array<{ id: Density; label: string; hint: string }> = [
  { id: 'comfortable', label: 'Comfortable', hint: 'Roomier padding throughout.' },
  { id: 'compact', label: 'Compact', hint: 'More on screen at once.' },
];

function newThemeId(): string {
  return `theme_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Starts a new custom theme from whatever palette is on screen right now. */
function seedColorsFromComputedStyle(): CustomThemeColors {
  const styles = getComputedStyle(document.documentElement);
  const colors = {} as CustomThemeColors;
  for (const [key, cssVar] of Object.entries(CUSTOM_THEME_VARS) as Array<
    [keyof CustomThemeColors, string]
  >) {
    colors[key] = styles.getPropertyValue(cssVar).trim() || '#808080';
  }
  return colors;
}

export function AppearanceSettings() {
  const appearance = useSettingsStore((s) => s.settings.appearance);
  const update = useSettingsStore((s) => s.update);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);

  function createTheme() {
    const theme: CustomTheme = {
      id: newThemeId(),
      name: `Custom theme ${appearance.customThemes.length + 1}`,
      colors: seedColorsFromComputedStyle(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    update('appearance', {
      customThemes: [...appearance.customThemes, theme],
      visualMode: 'custom',
      activeCustomThemeId: theme.id,
    });
    setEditingThemeId(theme.id);
  }

  function activateTheme(id: string) {
    update('appearance', { visualMode: 'custom', activeCustomThemeId: id });
  }

  function deleteTheme(id: string) {
    const wasActive = appearance.visualMode === 'custom' && appearance.activeCustomThemeId === id;
    update('appearance', {
      customThemes: appearance.customThemes.filter((t) => t.id !== id),
      ...(wasActive ? { visualMode: 'natural', activeCustomThemeId: null } : null),
    });
  }

  return (
    <>
      <SettingsSection title="Theme" description="Dark is the default.">
        <div className="grid grid-cols-3 gap-1.5 py-2">
          {THEMES.map((option) => {
            const Icon = option.icon;
            const active = appearance.theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => update('appearance', { theme: option.id })}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-[var(--radius-control)] border px-3 py-3 transition-colors',
                  active
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'border-[var(--color-line)] text-[var(--color-ink-muted)] hover:border-[var(--color-line-strong)]',
                )}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="text-[0.78rem]">{option.label}</span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Visual mode"
        description="A full reskin of the whole app. Anything but Natural overrides the theme above."
      >
        <div className="flex flex-col gap-1.5 py-2">
          {VISUAL_MODES.map((option) => {
            const Icon = option.icon;
            const active = appearance.visualMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => update('appearance', { visualMode: option.id })}
                className={cn(
                  'flex items-start gap-2.5 rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                    : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                )}
              >
                <Icon
                  size={15}
                  className={cn('mt-0.5 shrink-0', active ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-faint)]')}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-[0.82rem] text-[var(--color-ink)]">{option.label}</span>
                  <span className="mt-0.5 block text-[0.72rem] leading-relaxed text-[var(--color-ink-faint)]">
                    {option.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Custom themes"
        description="Design your own palette. Activating one makes it the app's visual mode."
      >
        <div className="flex flex-col gap-1.5 py-2">
          {appearance.customThemes.length === 0 && (
            <p className="text-[0.78rem] leading-relaxed text-[var(--color-ink-faint)]">
              No custom themes yet — start one from the palette currently on screen.
            </p>
          )}
          {appearance.customThemes.map((theme) => {
            const active = appearance.visualMode === 'custom' && appearance.activeCustomThemeId === theme.id;
            return (
              <div
                key={theme.id}
                className={cn(
                  'flex items-center gap-2 rounded-[var(--radius-control)] border px-2.5 py-2 transition-colors',
                  active
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                    : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                )}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => activateTheme(theme.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span className="flex shrink-0 -space-x-1" aria-hidden="true">
                    {(['canvas', 'accent', 'ink'] as const).map((key) => (
                      <span
                        key={key}
                        className="h-4 w-4 rounded-full border border-[var(--color-overlay)]"
                        style={{ backgroundColor: theme.colors[key] }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 truncate text-[0.82rem] text-[var(--color-ink)]">{theme.name}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditingThemeId(theme.id)}
                  aria-label={`Edit ${theme.name}`}
                >
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteTheme(theme.id)}
                  aria-label={`Delete ${theme.name}`}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            );
          })}
          <Button variant="secondary" size="sm" onClick={createTheme} className="mt-1 self-start">
            <Plus size={14} aria-hidden="true" />
            New custom theme
          </Button>
        </div>
      </SettingsSection>

      <CustomThemeEditorDialog themeId={editingThemeId} onClose={() => setEditingThemeId(null)} />

      <SettingsSection title="Density">
        <div className="grid grid-cols-2 gap-1.5 py-2">
          {DENSITIES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={appearance.density === option.id}
              onClick={() => update('appearance', { density: option.id })}
              className={cn(
                'rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition-colors',
                appearance.density === option.id
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                  : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
              )}
            >
              <span className="block text-[0.82rem] text-[var(--color-ink)]">{option.label}</span>
              <span className="mt-0.5 block text-[0.72rem] text-[var(--color-ink-faint)]">
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Scale and motion">
        <Slider
          label="Interface scale"
          value={appearance.uiScale}
          min={0.85}
          max={1.3}
          step={0.05}
          onChange={(uiScale) => update('appearance', { uiScale })}
          format={(value) => `${Math.round(value * 100)}%`}
        />
        <Switch
          label="Animations"
          description="Panel transitions, drawers and the command palette."
          checked={appearance.animations}
          onChange={(animations) => update('appearance', { animations })}
        />
        <Switch
          label="Reduce motion"
          description="Removes all non-essential movement, overriding the setting above."
          checked={appearance.reducedMotion}
          onChange={(reducedMotion) => update('appearance', { reducedMotion })}
        />
      </SettingsSection>
    </>
  );
}
