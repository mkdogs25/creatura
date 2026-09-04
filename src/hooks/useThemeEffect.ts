import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import type { CustomThemeColors } from '@/types/domain';

/** Maps CustomThemeColors fields to the `--color-*` custom properties they override. */
export const CUSTOM_THEME_VARS: Record<keyof CustomThemeColors, string> = {
  canvas: '--color-canvas',
  surface: '--color-surface',
  surfaceRaised: '--color-surface-raised',
  surfaceSunken: '--color-surface-sunken',
  overlay: '--color-overlay',
  line: '--color-line',
  lineStrong: '--color-line-strong',
  ink: '--color-ink',
  inkMuted: '--color-ink-muted',
  inkFaint: '--color-ink-faint',
  accent: '--color-accent',
  accentSoft: '--color-accent-soft',
  accentInk: '--color-accent-ink',
  danger: '--color-danger',
  success: '--color-success',
  grammar: '--color-grammar',
};

/**
 * Applies appearance settings to the document root.
 *
 * The theme class is also mirrored to localStorage — not as a database, but so
 * the inline script in index.html can paint the right background before React
 * has loaded and avoid a white flash on a dark-mode launch.
 */
export function useThemeEffect(): void {
  const appearance = useSettingsStore((s) => s.settings.appearance);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const dark =
        appearance.theme === 'dark' ||
        (appearance.theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
    };

    apply();
    try {
      localStorage.setItem('creatura.theme', appearance.theme);
    } catch {
      /* storage may be blocked; the theme still applies for this session */
    }

    if (appearance.theme !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [appearance.theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--ui-scale', String(appearance.uiScale));
    root.classList.toggle('motion-off', appearance.reducedMotion || !appearance.animations);
    root.dataset.density = appearance.density;
    root.dataset.visualMode = appearance.visualMode;

    const activeTheme =
      appearance.visualMode === 'custom'
        ? appearance.customThemes.find((t) => t.id === appearance.activeCustomThemeId)
        : undefined;

    for (const [key, cssVar] of Object.entries(CUSTOM_THEME_VARS) as Array<
      [keyof CustomThemeColors, string]
    >) {
      if (activeTheme) {
        root.style.setProperty(cssVar, activeTheme.colors[key]);
      } else {
        root.style.removeProperty(cssVar);
      }
    }
  }, [
    appearance.uiScale,
    appearance.reducedMotion,
    appearance.animations,
    appearance.density,
    appearance.visualMode,
    appearance.customThemes,
    appearance.activeCustomThemeId,
  ]);
}
