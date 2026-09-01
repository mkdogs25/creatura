import { Monitor, Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { cn } from '@/utils/cn';
import type { Density, ThemeMode } from '@/types/domain';

const THEMES: Array<{ id: ThemeMode; label: string; icon: typeof Moon }> = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
];

const DENSITIES: Array<{ id: Density; label: string; hint: string }> = [
  { id: 'comfortable', label: 'Comfortable', hint: 'Roomier padding throughout.' },
  { id: 'compact', label: 'Compact', hint: 'More on screen at once.' },
];

export function AppearanceSettings() {
  const appearance = useSettingsStore((s) => s.settings.appearance);
  const update = useSettingsStore((s) => s.update);

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
