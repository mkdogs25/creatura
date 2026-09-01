import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { EntityReferenceView } from '@/editor/nodes/EntityReferenceView';

export interface EntityReferenceAttrs {
  /** The stable id — `character_x9f2`. This is the only thing that matters. */
  entityId: string;
  /** The name at insertion time, kept purely as a fallback and for plain-text export. */
  label: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    entityReference: {
      insertEntityReference: (attrs: EntityReferenceAttrs) => ReturnType;
    };
  }
}

/**
 * An inline, atomic reference to a project entity.
 *
 * The node stores an id, never a name. The displayed label is re-resolved from
 * the store on every render, so renaming a character updates every sentence
 * that mentions them, and deleting one leaves a visible unresolved token
 * instead of a broken document.
 */
export const EntityReference = Node.create({
  name: 'entityReference',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      entityId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-entity-id') ?? '',
        renderHTML: (attributes) => ({ 'data-entity-id': attributes.entityId }),
      },
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') ?? element.textContent ?? '',
        renderHTML: (attributes) => ({ 'data-label': attributes.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-entity-id]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'entity-ref' }),
      `@${node.attrs.label || 'Unknown'}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label || 'Unknown'}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntityReferenceView);
  },

  addCommands() {
    return {
      insertEntityReference:
        (attrs) =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent([
              { type: this.name, attrs },
              // A trailing space keeps the caret out of the atom node.
              { type: 'text', text: ' ' },
            ])
            .run(),
    };
  },
});
