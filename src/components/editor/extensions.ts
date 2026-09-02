import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import CharacterCount from '@tiptap/extension-character-count';
import type { Extensions } from '@tiptap/core';
import { EntityReference } from '@/editor/nodes/EntityReference';
import { MentionSuggestion, WikiLinkSuggestion } from '@/editor/extensions/mentionSuggestion';
import { AutoCapitalize } from '@/editor/extensions/autoCapitalize';
import type { WritingSettings } from '@/types/domain';

/**
 * The editor's extension set.
 *
 * Typography (smart quotes, em dashes) is configured from the writing settings
 * and rebuilt only when those change — never on a keystroke, because
 * re-creating extensions means re-creating the editor and losing the caret.
 */
export function buildExtensions(writing: WritingSettings): Extensions {
  const smart = writing.smartQuotes;
  const dashes = writing.emDashes;

  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: { HTMLAttributes: { spellcheck: 'false' } },
      horizontalRule: {},
      history: { depth: 200, newGroupDelay: 400 },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      protocols: ['http', 'https', 'mailto'],
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    Typography.configure({
      // Each replacement can be disabled independently by passing `false`.
      openDoubleQuote: smart ? undefined : false,
      closeDoubleQuote: smart ? undefined : false,
      openSingleQuote: smart ? undefined : false,
      closeSingleQuote: smart ? undefined : false,
      emDash: dashes ? undefined : false,
      ellipsis: undefined,
    }),
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === 'heading'
          ? 'Heading'
          : 'Begin writing. Type @ or [[ to link anything…',
      showOnlyWhenEditable: true,
      includeChildren: false,
    }),
    // Maintains counts incrementally so the footer never re-reads the document.
    CharacterCount.configure({ limit: null }),
    EntityReference,
    MentionSuggestion,
    WikiLinkSuggestion,
    ...(writing.autoCapitalize ? [AutoCapitalize] : []),
  ];
}
