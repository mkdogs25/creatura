import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  buildMatchDecorations,
  findMatches,
  findReplaceKey,
  type TextMatch,
} from '@/editor/extensions/findReplace';
import { DecorationSet } from '@tiptap/pm/view';

export interface UseFindReplace {
  query: string;
  setQuery: (query: string) => void;
  replacement: string;
  setReplacement: (replacement: string) => void;
  caseSensitive: boolean;
  toggleCaseSensitive: () => void;
  matches: TextMatch[];
  activeIndex: number;
  next: () => void;
  prev: () => void;
  replaceCurrent: () => void;
  replaceAll: () => void;
  deleteAll: () => void;
}

/**
 * Drives find/replace against whichever Tiptap editor is currently mounted.
 * Match positions and the active-match decoration are recomputed on every
 * document change (typing elsewhere shifts them) as well as on every query
 * edit, and pushed into the editor purely as plugin-state metadata — never
 * through a doc-changing transaction, so highlighting a match never marks
 * the document dirty or disturbs undo history. Only the two replace actions
 * actually edit the document.
 */
export function useFindReplace(editor: Editor | null): UseFindReplace {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matches, setMatches] = useState<TextMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const recompute = useCallback(
    (preserveFrom?: number) => {
      if (!editor) {
        setMatches([]);
        return;
      }
      const found = findMatches(editor.state.doc, query, caseSensitive);
      setMatches(found);
      setActiveIndex((current) => {
        if (found.length === 0) return 0;
        if (preserveFrom !== undefined) {
          const idx = found.findIndex((m) => m.from >= preserveFrom);
          return idx === -1 ? 0 : idx;
        }
        return Math.min(current, found.length - 1);
      });
    },
    [editor, query, caseSensitive],
  );

  // Recompute whenever the query/case toggle changes.
  useEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseSensitive, editor]);

  // Recompute whenever the document changes elsewhere (typing, a restore,
  // switching to a different doc/chapter while the bar stays open).
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => recompute();
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, recompute]);

  // Paint decorations for the current match set, and scroll the active one
  // into view.
  useEffect(() => {
    if (!editor) return;
    const decorations = query ? buildMatchDecorations(matches, activeIndex) : [];
    const set = DecorationSet.create(editor.state.doc, decorations);
    const tr = editor.state.tr.setMeta(findReplaceKey, set).setMeta('addToHistory', false);
    editor.view.dispatch(tr);

    const active = matches[activeIndex];
    if (active) {
      const coords = editor.view.coordsAtPos(active.from);
      const scroller = editor.view.dom.closest('[data-editor-scroll]') as HTMLElement | null;
      if (scroller) {
        const bounds = scroller.getBoundingClientRect();
        if (coords.top < bounds.top || coords.top > bounds.bottom - 40) {
          scroller.scrollTop += coords.top - (bounds.top + bounds.height / 2);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, matches, activeIndex, query]);

  // Clear decorations when the bar's editor instance changes/unmounts.
  useEffect(() => {
    return () => {
      if (!editor || editor.isDestroyed) return;
      const tr = editor.state.tr.setMeta(findReplaceKey, DecorationSet.empty).setMeta('addToHistory', false);
      editor.view.dispatch(tr);
    };
  }, [editor]);

  const next = useCallback(() => {
    setActiveIndex((current) => (matches.length === 0 ? 0 : (current + 1) % matches.length));
  }, [matches.length]);

  const prev = useCallback(() => {
    setActiveIndex((current) =>
      matches.length === 0 ? 0 : (current - 1 + matches.length) % matches.length,
    );
  }, [matches.length]);

  const toggleCaseSensitive = useCallback(() => setCaseSensitive((c) => !c), []);

  const replaceCurrent = useCallback(() => {
    if (!editor) return;
    const match = matches[activeIndex];
    if (!match) return;
    const tr = editor.state.tr.insertText(replacement, match.from, match.to);
    editor.view.dispatch(tr);
    editor.commands.focus();
    // The next match now starts where this one ended, in the edited doc.
    recompute(match.from + replacement.length);
  }, [editor, matches, activeIndex, replacement, recompute]);

  const replaceAll = useCallback(() => {
    if (!editor || matches.length === 0) return;
    const tr = editor.state.tr;
    // Process from the end of the document backward so each edit's position
    // is still valid — nothing after it has moved yet.
    const ordered = [...matches].sort((a, b) => b.from - a.from);
    for (const match of ordered) {
      tr.insertText(replacement, match.from, match.to);
    }
    editor.view.dispatch(tr);
    editor.commands.focus();
    recompute();
  }, [editor, matches, replacement, recompute]);

  /**
   * Removes every match outright — a bulk delete, independent of whatever
   * (if anything) is typed in the Replace field. One click instead of
   * clearing Replace and hitting "Replace all" to get the same result.
   */
  const deleteAll = useCallback(() => {
    if (!editor || matches.length === 0) return;
    const tr = editor.state.tr;
    const ordered = [...matches].sort((a, b) => b.from - a.from);
    for (const match of ordered) {
      tr.delete(match.from, match.to);
    }
    editor.view.dispatch(tr);
    editor.commands.focus();
    recompute();
  }, [editor, matches, recompute]);

  return useMemo(
    () => ({
      query,
      setQuery,
      replacement,
      setReplacement,
      caseSensitive,
      toggleCaseSensitive,
      matches,
      activeIndex,
      next,
      prev,
      replaceCurrent,
      replaceAll,
      deleteAll,
    }),
    [
      query,
      replacement,
      caseSensitive,
      toggleCaseSensitive,
      matches,
      activeIndex,
      next,
      prev,
      replaceCurrent,
      replaceAll,
      deleteAll,
    ],
  );
}
