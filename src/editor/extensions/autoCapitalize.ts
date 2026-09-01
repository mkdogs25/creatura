import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Capitalises the first letter of a sentence as it is typed.
 *
 * Deliberately conservative: it fires only on the very first character of a
 * block, or on the first letter after `.`/`?`/`!` plus a space. It never
 * rewrites text that is already on the page, so a deliberately lowercase
 * opening line stays lowercase once written.
 */
export const AutoCapitalize = Extension.create({
  name: 'autoCapitalize',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('creaturaAutoCapitalize'),
        props: {
          handleTextInput(view, from, _to, text) {
            if (text.length !== 1 || !/[a-z]/.test(text)) return false;

            const { $from } = view.state.selection;
            const before = $from.parent.textBetween(
              Math.max(0, $from.parentOffset - 2),
              $from.parentOffset,
              undefined,
              ' ',
            );

            const atBlockStart = $from.parentOffset === 0;
            const afterSentence = /[.?!]\s$/.test(before);
            if (!atBlockStart && !afterSentence) return false;

            view.dispatch(view.state.tr.insertText(text.toUpperCase(), from, _to));
            return true;
          },
        },
      }),
    ];
  },
});
