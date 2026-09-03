import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Strips the syntax markers other note apps (Obsidian, chiefly) leave behind
 * when their raw markdown is pasted in — not just wiki-links, but the whole
 * family of source-view clutter that comes along with them. None of this
 * has a rendering in Creatura's schema, so left alone it shows up as literal
 * bracket/percent noise in the middle of a sentence.
 *
 * Deliberately text-only (`transformPastedText`, not a full node transform):
 * it cleans up what's typed, but doesn't try to guess which bracketed names
 * should become live entity references — that's what typing `[[` again, or
 * the repeated-name suggestions, are for.
 */
export function cleanPastedText(text: string): string {
  let out = text;

  // YAML frontmatter at the very top of the file.
  out = out.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

  // %%hidden comments%%, including ones spanning several lines.
  out = out.replace(/%%[\s\S]*?%%/g, '');

  // ![[Embed]] and [[Target#Heading|Alias]] -> Alias, or Target if there's
  // no alias. The heading/block fragment after `#` never carries meaning
  // outside the original vault, so it's dropped along with the brackets.
  out = out.replace(
    /!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g,
    (_match, target: string, alias: string | undefined) => (alias ?? target).trim(),
  );

  // Block-reference tags ("^abc123") Obsidian appends to a line so other
  // notes can link that exact paragraph.
  out = out.replace(/ \^[a-zA-Z0-9-]+(?=\r?\n|$)/g, '');

  // ==highlight== markers — Creatura's schema has no highlight mark to map
  // them onto, so the emphasis is dropped rather than left as literal `==`.
  out = out.replace(/==([^=\n]+)==/g, '$1');

  return out;
}

export const PasteCleanup = Extension.create({
  name: 'pasteCleanup',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('creaturaPasteCleanup'),
        props: {
          transformPastedText(text) {
            return cleanPastedText(text);
          },
        },
      }),
    ];
  },
});
