import { create } from 'zustand';
import type { Settings } from '@/types/domain';
import { defaultSettings } from '@/data/defaultSettings';
import { loadSettings, putSettings } from '@/db/repositories/projectRepository';

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<Settings>;
  /** Deep-merges one settings section and persists the result. */
  update: <K extends keyof Settings>(key: K, value: Partial<Settings[K]> | Settings[K]) => void;
  reset: () => void;
}

let writeTimer: number | undefined;

/** Settings are small and change rarely — a short debounce is plenty. */
function persist(settings: Settings): void {
  window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    void putSettings(settings).catch((error) => {
      console.error('[creatura] failed to persist settings', error);
    });
  }, 200);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings(),
  loaded: false,

  load: async () => {
    let settings: Settings;
    try {
      settings = await loadSettings();
    } catch (error) {
      console.error('[creatura] failed to load settings, using defaults', error);
      settings = defaultSettings();
    }
    set({ settings, loaded: true });
    return settings;
  },

  update: (key, value) => {
    const current = get().settings;
    const section = current[key];
    const merged: Settings =
      section && typeof section === 'object' && !Array.isArray(section)
        ? { ...current, [key]: { ...(section as object), ...(value as object) } }
        : { ...current, [key]: value as Settings[typeof key] };
    set({ settings: merged });
    persist(merged);
  },

  reset: () => {
    const next = { ...defaultSettings(), activeProjectId: get().settings.activeProjectId };
    set({ settings: next });
    persist(next);
  },
}));
