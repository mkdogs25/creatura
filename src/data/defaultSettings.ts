import type { Settings } from '@/types/domain';

/** The settings a fresh installation starts from. Dark mode, Charter, autosave on. */
export function defaultSettings(): Settings {
  return {
    id: 'app',
    appearance: {
      theme: 'dark',
      density: 'comfortable',
      uiScale: 1,
      animations: true,
      reducedMotion: false,
    },
    editor: {
      fontFamily: 'charter',
      fontSize: 18,
      lineHeight: 1.7,
      writingWidth: 720,
      paragraphSpacing: 0.75,
      spellcheck: true,
      showWordCount: true,
      showCharCount: true,
      showToolbar: true,
      typewriterMode: false,
    },
    writing: {
      autosave: true,
      autosaveDelay: 700,
      wordGoal: 0,
      defaultDocKind: 'note',
      smartQuotes: true,
      emDashes: true,
      autoCapitalize: false,
    },
    interface: {
      sidebarDefaultOpen: true,
      metadataDefaultOpen: true,
      leftPanelWidth: 272,
      rightPanelWidth: 320,
      tooltips: true,
      confirmDestructive: true,
    },
    onboardingComplete: false,
    activeProjectId: null,
    lastExportAt: null,
  };
}
