import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const findReplaceKey = new PluginKey<DecorationSet>('creatura-find-replace');

/**
 * Holds the highlight decorations the find bar paints over matches. The bar
 * itself owns match state (query, positions, current index) and just pushes
 * a fresh decoration set in on every change via transaction meta — this
 * plugin's only job is to keep that set mapped across unrelated edits so
 * highlights don't drift while the writer keeps typing elsewhere.
 */
export const FindReplace = Extension.create({
  name: 'findReplace',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findReplaceKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const next = tr.getMeta(findReplaceKey) as DecorationSet | undefined;
            if (next) return next;
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return findReplaceKey.getState(state);
          },
        },
      }),
    ];
  },
});

export interface TextMatch {
  from: number;
  to: number;
}

/** Finds every occurrence of `query` in the document's text content, in
 * document order, as absolute ProseMirror positions. */
export function findMatches(
  doc: import('@tiptap/pm/model').Node,
  query: string,
  caseSensitive: boolean,
): TextMatch[] {
  if (!query) return [];
  const matches: TextMatch[] = [];
  const needle = caseSensitive ? query : query.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const haystack = caseSensitive ? node.text : node.text.toLowerCase();
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      matches.push({ from: pos + index, to: pos + index + needle.length });
      index = haystack.indexOf(needle, index + 1);
    }
  });
  return matches;
}

export function buildMatchDecorations(matches: TextMatch[], activeIndex: number): Decoration[] {
  return matches.map((match, index) =>
    Decoration.inline(match.from, match.to, {
      class: index === activeIndex ? 'find-match find-match-active' : 'find-match',
    }),
  );
}
