import { create } from 'zustand';
import type { AnyDoc } from '@/types/domain';

export interface MentionCandidate {
  doc: AnyDoc;
  /** Path shown under the name, so two similarly-named entries stay distinct. */
  context: string;
}

interface MentionState {
  open: boolean;
  query: string;
  items: MentionCandidate[];
  index: number;
  rect: DOMRect | null;
  /** Provided by the suggestion plugin; inserts the chosen reference. */
  select: ((candidate: MentionCandidate) => void) | null;

  show: (payload: {
    query: string;
    items: MentionCandidate[];
    rect: DOMRect | null;
    select: (candidate: MentionCandidate) => void;
  }) => void;
  move: (delta: number) => void;
  setIndex: (index: number) => void;
  hide: () => void;
}

/**
 * Bridges the ProseMirror suggestion plugin (imperative) and the React
 * autocomplete popup (declarative). The plugin pushes state here; the popup
 * subscribes. Nothing mounts a React root from inside a plugin callback.
 */
export const useMentionStore = create<MentionState>((set, get) => ({
  open: false,
  query: '',
  items: [],
  index: 0,
  rect: null,
  select: null,

  show: ({ query, items, rect, select }) =>
    set((state) => ({
      open: true,
      query,
      items,
      rect,
      select,
      // Keep the highlight where it was while the list is still valid.
      index: Math.min(state.index, Math.max(0, items.length - 1)),
    })),

  move: (delta) => {
    const { items, index } = get();
    if (items.length === 0) return;
    set({ index: (index + delta + items.length) % items.length });
  },

  setIndex: (index) => set({ index }),

  hide: () => set({ open: false, items: [], query: '', index: 0, select: null, rect: null }),
}));
