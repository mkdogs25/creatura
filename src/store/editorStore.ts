import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

interface EditorState {
  /** Document currently open in the centre panel. */
  activeDocId: string | null;
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

  setActiveDoc: (docId: string | null) => void;
  setEditor: (editor: Editor | null) => void;
  setCounts: (words: number, chars: number) => void;
  setDirty: (dirty: boolean) => void;
  reloadContent: () => void;
  noteSnapshotWritten: () => void;
}

/**
 * Editor state is deliberately separate from project state: it changes on
 * every keystroke, and nothing that subscribes to project data should
 * re-render because the caret moved.
 */
export const useEditorStore = create<EditorState>((set) => ({
  activeDocId: null,
  editor: null,
  liveWords: 0,
  liveChars: 0,
  dirty: false,
  reloadToken: 0,
  historyToken: 0,

  setActiveDoc: (docId) => set({ activeDocId: docId }),
  setEditor: (editor) => set({ editor }),
  setCounts: (liveWords, liveChars) => set({ liveWords, liveChars }),
  setDirty: (dirty) => set({ dirty }),
  reloadContent: () => set((state) => ({ reloadToken: state.reloadToken + 1 })),
  noteSnapshotWritten: () => set((state) => ({ historyToken: state.historyToken + 1 })),
}));
