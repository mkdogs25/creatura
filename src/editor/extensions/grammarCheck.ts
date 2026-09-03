import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { useSettingsStore } from '@/store/settingsStore';

export interface GrammarIssue {
  from: number;
  to: number;
  message: string;
  replacement: string;
}

/** Words that end a sentence-ending period without actually ending the
 * sentence, so the lowercase-word-after check doesn't fire on "Dr. smith". */
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'mx', 'dr', 'st', 'vs', 'etc', 'jr', 'sr', 'prof',
  'sgt', 'capt', 'gen', 'rev', 'no', 'vol', 'ch', 'fig', 'approx',
]);

interface Rule {
  re: RegExp;
  message: (m: RegExpExecArray) => string;
  replacement: (m: RegExpExecArray) => string;
}

const RULES: Rule[] = [
  {
    // A word immediately repeated ("the the"), case-insensitive.
    re: /\b([A-Za-z]+)([ \t]+)\1\b/gi,
    message: (m) => `Repeated word "${m[1]}"`,
    replacement: (m) => m[1],
  },
  {
    re: /\b(could|should|would|might|must)\s+of\b/gi,
    message: (m) => `Did you mean "${m[1]} have"?`,
    replacement: (m) => `${m[1]} have`,
  },
  {
    re: /\balot\b/gi,
    message: () => 'Did you mean "a lot"?',
    replacement: () => 'a lot',
  },
  {
    re: /\birregardless\b/gi,
    message: () => 'Did you mean "regardless"?',
    replacement: () => 'regardless',
  },
  {
    // Two or more of the same punctuation mark in a row — not "..." (ellipsis).
    re: /([!?,;])\1+/g,
    message: () => 'Repeated punctuation',
    replacement: (m) => m[1],
  },
];

/** Finds issues within one textblock's plain text, given a map from string
 * index to the document position that character actually lives at. */
function findIssuesInBlock(text: string, map: number[]): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      if (end > map.length) continue;
      issues.push({
        from: map[start],
        to: map[end - 1] + 1,
        message: rule.message(m),
        replacement: rule.replacement(m),
      });
      if (m[0].length === 0) rule.re.lastIndex += 1;
    }
  }

  // Sentence-start lowercase after . ! ? — needs the word immediately before
  // the period to decide whether it's a real sentence end or an abbreviation.
  const startRe = /([.!?])(\s+)([a-z])/g;
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(text))) {
    const periodIndex = m.index;
    const wordBefore = text.slice(0, periodIndex).match(/([A-Za-z]+)$/);
    if (wordBefore && ABBREVIATIONS.has(wordBefore[1].toLowerCase())) continue;
    const letterIndex = periodIndex + m[1].length + m[2].length;
    if (letterIndex >= map.length) continue;
    issues.push({
      from: map[letterIndex],
      to: map[letterIndex] + 1,
      message: 'Sentence should start with a capital letter',
      replacement: m[3].toUpperCase(),
    });
  }

  return issues;
}

function findIssues(doc: PMNode): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    let text = '';
    const map: number[] = [];
    node.forEach((child, offset) => {
      if (child.isText && child.text) {
        const childPos = pos + 1 + offset;
        for (let i = 0; i < child.text.length; i += 1) map.push(childPos + i);
        text += child.text;
      } else {
        // A non-text child (an entity reference, say) breaks up the run of
        // prose — stand in with a space so word-boundary rules don't merge
        // the text on either side of it into one false match.
        text += ' ';
        map.push(pos + 1 + offset);
      }
    });
    issues.push(...findIssuesInBlock(text, map));
  });
  return issues;
}

function buildDecorations(doc: PMNode): DecorationSet {
  const decorations = findIssues(doc).map((issue) =>
    Decoration.inline(
      issue.from,
      issue.to,
      { class: 'grammar-flag', title: issue.message },
      { grammar: issue },
    ),
  );
  return DecorationSet.create(doc, decorations);
}

const grammarPluginKey = new PluginKey<DecorationSet>('creaturaGrammarCheck');

/**
 * A fully local grammar & style pass — repeated words, "could of", repeated
 * punctuation, a lowercase sentence start — flagged with a wavy underline
 * distinct from native spellcheck's, and click-to-fix. Deliberately narrow:
 * every rule here is a near-certain error, not a guess, since a false
 * positive is worse than a missed one for something this visible.
 *
 * Always computes decorations (cheap regex work); the setting toggle hides
 * them visually via a CSS class on the editor DOM rather than rebuilding the
 * extension, so switching it off and on never costs the editor's undo
 * history or caret position the way recreating the Tiptap instance would.
 */
export const GrammarCheck = Extension.create({
  name: 'grammarCheck',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: grammarPluginKey,
        state: {
          init: (_, { doc }) => buildDecorations(doc),
          apply: (tr, old) => (tr.docChanged ? buildDecorations(tr.doc) : old.map(tr.mapping, tr.doc)),
        },
        props: {
          decorations(state) {
            return grammarPluginKey.getState(state) ?? null;
          },
          handleClick(view, pos) {
            if (!useSettingsStore.getState().settings.editor.grammarCheck) return false;
            const decorations = grammarPluginKey.getState(view.state);
            if (!decorations) return false;
            const [deco] = decorations.find(pos, pos);
            if (!deco) return false;
            const issue = (deco.spec as { grammar?: GrammarIssue }).grammar;
            if (!issue) return false;
            view.dispatch(view.state.tr.insertText(issue.replacement, deco.from, deco.to));
            return true;
          },
        },
      }),
    ];
  },
});
