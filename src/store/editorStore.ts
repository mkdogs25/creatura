import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

interface EditorState {
  /** Document currently open in World Library's centre panel. */
  activeDocId: string | null;
  /**
   * Every document currently held open as a tab, in tab order. The centre
   * panel still mounts one Tiptap instance and swaps its content by
   * `activeDocId` — tabs are a list of "places to jump back to," not
   * separate live editors.
   */
  openTabIds: string[];
  /** Chapter currently open in the Manuscript view — a separate slot since
   * the two views are mutually exclusive but each remembers its own place. */
  activeChapterId: string | null;
  /** The live Tiptap instance, registered by the editor component. */
  editor: Editor | null;
  /** Live counts, updated on selection/transaction rather than from storage. */
  liveWords: number;
  liveChars: number;
  /** True while the debounce window between typing and persistence is open. */
  dirty: boolean;
  /**
   * Bumped when the open document's content is replaced from outside the
   * editor (a restored snapshot). The editor re-reads its content on change
   * without being re-created.
   */
  reloadToken: number;
  /** Bumped when a restore point is written, so the history list re-reads. */
  historyToken: number;
  /** Whether the find/replace bar is open over the current editor. */
  findReplaceOpen: boolean;

  /** Opens a document as a tab (if it isn't one already) and switches to it.
   * Pass `null` to just clear the centre panel without touching open tabs. */
  setActiveDoc: (docId: string | null) => void;
  /** Closes one tab. If it was the active one, falls back to its neighbor —
   * the tab that was to its left, or otherwise the one that took its place —
   * or `null` once the last tab closes. */
  closeTab: (docId: string) => void;
  /** Drops any tab not present in `validIds` — for when a doc is deleted
   * (elsewhere, or by another tab) out from under an open tab. */
  pruneTabs: (validIds: ReadonlySet<string>) => void;
  setActiveChapter: (chapterId: string | null) => void;
  setEditor: (editor: Editor | null) => void;
  setCounts: (words: number, chars: number) => void;
  setDirty: (dirty: boolean) => void;
  reloadContent: () => void;
  noteSnapshotWritten: () => void;
  setFindReplaceOpen: (open: boolean) => void;
  toggleFindReplace: () => void;
}

/**
 * Editor state is deliberately separate from project state: it changes on
 * every keystroke, and nothing that subscribes to project data should
 * re-render because the caret moved.
 */
export const useEditorStore = create<EditorState>((set, get) => ({
  activeDocId: null,
  openTabIds: [],
  activeChapterId: null,
  editor: null,
  liveWords: 0,
  liveChars: 0,
  dirty: false,
  reloadToken: 0,
  historyToken: 0,
  findReplaceOpen: false,

  setActiveDoc: (docId) => {
    if (!docId) {
      set({ activeDocId: null });
      return;
    }
    set((state) => ({
      activeDocId: docId,
      openTabIds: state.openTabIds.includes(docId)
        ? state.openTabIds
        : [...state.openTabIds, docId],
    }));
  },
  closeTab: (docId) => {
    const { openTabIds, activeDocId } = get();
    const index = openTabIds.indexOf(docId);
    if (index === -1) return;
    const nextTabIds = openTabIds.filter((id) => id !== docId);
    if (activeDocId !== docId) {
      set({ openTabIds: nextTabIds });
      return;
    }
    // Prefer the tab that was to the left; the closed tab's own former
    // position (now occupied by its right neighbor) covers the rest.
    const nextActive = nextTabIds[Math.min(index, nextTabIds.length - 1)] ?? null;
    set({ openTabIds: nextTabIds, activeDocId: nextActive });
  },
  pruneTabs: (validIds) => {
    const { openTabIds, activeDocId } = get();
    const nextTabIds = openTabIds.filter((id) => validIds.has(id));
    if (nextTabIds.length === openTabIds.length) return;
    set({
      openTabIds: nextTabIds,
      activeDocId: activeDocId && validIds.has(activeDocId) ? activeDocId : null,
    });
  },
  setActiveChapter: (chapterId) => set({ activeChapterId: chapterId }),
  setEditor: (editor) => set({ editor }),
  setCounts: (liveWords, liveChars) => set({ liveWords, liveChars }),
  setDirty: (dirty) => set({ dirty }),
  reloadContent: () => set((state) => ({ reloadToken: state.reloadToken + 1 })),
  noteSnapshotWritten: () => set((state) => ({ historyToken: state.historyToken + 1 })),
  setFindReplaceOpen: (open) => set({ findReplaceOpen: open }),
  toggleFindReplace: () => set((state) => ({ findReplaceOpen: !state.findReplaceOpen })),
}));
