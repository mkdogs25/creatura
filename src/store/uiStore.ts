import { create } from 'zustand';
import type { ViewId } from '@/types/domain';
import { newId } from '@/utils/id';

export interface Toast {
  id: string;
  tone: 'success' | 'error' | 'info';
  title: string;
  body?: string;
  duration?: number;
  sticky?: boolean;
  action?: { label: string; onSelect: () => void };
}

export interface ConfirmRequest {
  title: string;
  body?: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export type PaletteMode = 'all' | 'commands' | 'search';

interface UiState {
  view: ViewId;
  /** Per-view scroll/selection is kept here so switching views is lossless. */
  previousView: ViewId;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  focusMode: boolean;
  paletteOpen: boolean;
  paletteMode: PaletteMode;
  paletteSeed: string;
  projectDialogOpen: boolean;
  onboardingOpen: boolean;
  mapOpen: boolean;
  /** Which Settings category is showing — lifted out of SettingsView so the
   * command palette can jump straight to one. */
  settingsCategory: string;
  toasts: Toast[];
  confirmRequest: ConfirmRequest | null;
  isNarrow: boolean;

  setView: (view: ViewId) => void;
  toggleLeftPanel: (open?: boolean) => void;
  toggleRightPanel: (open?: boolean) => void;
  setFocusMode: (on: boolean) => void;
  openPalette: (mode?: PaletteMode, seed?: string) => void;
  closePalette: () => void;
  setProjectDialogOpen: (open: boolean) => void;
  setOnboardingOpen: (open: boolean) => void;
  setMapOpen: (open: boolean) => void;
  setIsNarrow: (narrow: boolean) => void;
  setSettingsCategory: (id: string) => void;

  toast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
  confirm: (request: ConfirmRequest) => Promise<boolean>;
  resolveConfirm: (answer: boolean) => void;
}

let pendingConfirm: ((answer: boolean) => void) | null = null;

export const useUiStore = create<UiState>((set, get) => ({
  view: 'library',
  previousView: 'library',
  leftPanelOpen: true,
  rightPanelOpen: true,
  focusMode: false,
  paletteOpen: false,
  paletteMode: 'all',
  paletteSeed: '',
  projectDialogOpen: false,
  onboardingOpen: false,
  mapOpen: false,
  settingsCategory: 'appearance',
  toasts: [],
  confirmRequest: null,
  isNarrow: false,

  setView: (view) =>
    set((state) => (state.view === view ? state : { view, previousView: state.view })),

  toggleLeftPanel: (open) =>
    set((state) => ({ leftPanelOpen: open ?? !state.leftPanelOpen })),

  toggleRightPanel: (open) =>
    set((state) => ({ rightPanelOpen: open ?? !state.rightPanelOpen })),

  setFocusMode: (on) => set({ focusMode: on }),

  openPalette: (mode = 'all', seed = '') =>
    set({ paletteOpen: true, paletteMode: mode, paletteSeed: seed }),

  closePalette: () => set({ paletteOpen: false, paletteSeed: '' }),

  setProjectDialogOpen: (open) => set({ projectDialogOpen: open }),
  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
  setMapOpen: (open) => set({ mapOpen: open }),
  setIsNarrow: (narrow) => set({ isNarrow: narrow }),
  setSettingsCategory: (id) => set({ settingsCategory: id }),

  toast: (toast) => {
    const id = newId('tag');
    set((state) => ({ toasts: [...state.toasts.slice(-4), { ...toast, id }] }));
    return id;
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  confirm: (request) => {
    // A second confirm while one is open resolves the first as cancelled,
    // so a stray promise can never be left dangling.
    pendingConfirm?.(false);
    set({ confirmRequest: request });
    return new Promise<boolean>((resolve) => {
      pendingConfirm = resolve;
    });
  },

  resolveConfirm: (answer) => {
    const resolve = pendingConfirm;
    pendingConfirm = null;
    set({ confirmRequest: null });
    resolve?.(answer);
    void get;
  },
}));

/** Imperative helpers for non-React call sites (stores, editor commands). */
export const ui = {
  toast: (toast: Omit<Toast, 'id'>) => useUiStore.getState().toast(toast),
  confirm: (request: ConfirmRequest) => useUiStore.getState().confirm(request),
};
