import { generateHTML, mergeAttributes } from '@tiptap/core';
import { buildExtensions } from '@/components/editor/extensions';
import { EntityReference } from '@/editor/nodes/EntityReference';
import { docById } from '@/store/selectors';
import { firstWord } from '@/utils/text';
import { defaultSettings } from '@/data/defaultSettings';
import type { ProjectBundle, RichContent } from '@/types/domain';

// A plain-text variant for print/PDF: the editor's "@Name" spelling is a
// live-editing affordance (it's what you type to trigger the mention), not
// how a finished manuscript should read, so the printed rendering just
// shows the name.
const PrintEntityReference = EntityReference.extend({
  renderHTML({ HTMLAttributes, node }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'entity-ref' }), node.attrs.label || 'Unknown'];
  },
});

// A static extension set for headless rendering (print/PDF) — the writing
// settings only affect typography toggles that don't change the schema, so
// one shared instance built from defaults is enough; this never touches an
// actual editor or DOM, just the node/mark schema `generateHTML` needs.
const PRINT_EXTENSIONS = [
  ...buildExtensions(defaultSettings().writing).filter((ext) => ext.name !== 'entityReference'),
  PrintEntityReference,
];

/** Rewrites each entity reference's label to the entity's current name
 * before rendering, so a print/PDF export reads correctly even when a
 * character was renamed after the mention was written. */
function resolveLiveLabels(content: RichContent, bundle: ProjectBundle): RichContent {
  const walk = (node: unknown): unknown => {
    if (!node || typeof node !== 'object') return node;
    const n = node as Record<string, unknown>;
    if (n.type === 'entityReference' && n.attrs && typeof n.attrs === 'object') {
      const attrs = n.attrs as Record<string, unknown>;
      const doc = docById(bundle, String(attrs.entityId ?? ''));
      if (doc) {
        const label = attrs.short ? firstWord(doc.name) : doc.name;
        return { ...n, attrs: { ...attrs, label } };
      }
    }
    if (Array.isArray(n.content)) return { ...n, content: n.content.map(walk) };
    return n;
  };
  return walk(content) as RichContent;
}

/** Renders a Tiptap document to static HTML — used for the print/PDF view. */
export function richContentToHtml(content: RichContent, bundle: ProjectBundle): string {
  const resolved = resolveLiveLabels(content, bundle);
  return generateHTML(resolved as never, PRINT_EXTENSIONS);
}
