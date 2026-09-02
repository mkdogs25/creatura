import type { RichContent } from '@/types/domain';

interface DocNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Converts a Tiptap document back to markdown — the inverse of
 * `utils/markdown.ts`'s reader, covering the same subset (headings,
 * paragraphs, bold/italic/strike/code, links, lists, block quotes, fences,
 * rules). An `entityReference` becomes a `[[Name]]` wiki-link using
 * whatever name the caller's resolver returns for its id, which is what
 * makes an exported file still legible about who/where it's talking about
 * once it's left the project reference.
 */
export function docToMarkdown(
  content: RichContent,
  resolveEntity: (entityId: string, fallback: string) => string = (_id, fallback) => fallback,
): string {
  const blocks = ((content as unknown as DocNode).content ?? []).map((node) =>
    blockToMarkdown(node, resolveEntity),
  );
  return blocks.filter((block) => block.length > 0).join('\n\n').trim();
}

function blockToMarkdown(
  node: DocNode,
  resolveEntity: (entityId: string, fallback: string) => string,
  depth = 0,
): string {
  const indent = '  '.repeat(depth);
  switch (node.type) {
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
      return `${'#'.repeat(level)} ${inlineToMarkdown(node.content, resolveEntity)}`;
    }
    case 'paragraph':
      return inlineToMarkdown(node.content, resolveEntity);
    case 'blockquote':
      return (node.content ?? [])
        .map((child) => blockToMarkdown(child, resolveEntity))
        .join('\n')
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    case 'codeBlock': {
      const code = (node.content ?? []).map((child) => child.text ?? '').join('');
      return `\`\`\`\n${code}\n\`\`\``;
    }
    case 'horizontalRule':
      return '---';
    case 'bulletList':
      return (node.content ?? [])
        .map((item) => `${indent}- ${listItemToMarkdown(item, resolveEntity, depth)}`)
        .join('\n');
    case 'orderedList': {
      const start = Number(node.attrs?.start) || 1;
      return (node.content ?? [])
        .map(
          (item, index) => `${indent}${start + index}. ${listItemToMarkdown(item, resolveEntity, depth)}`,
        )
        .join('\n');
    }
    default:
      // Unknown/unsupported block types (as produced by anything outside the
      // editor's own schema) still contribute their text rather than
      // vanishing from the export.
      return inlineToMarkdown(node.content, resolveEntity);
  }
}

function listItemToMarkdown(
  item: DocNode,
  resolveEntity: (entityId: string, fallback: string) => string,
  depth: number,
): string {
  return (item.content ?? [])
    .map((child) => blockToMarkdown(child, resolveEntity, depth + 1))
    .join('\n')
    .trim();
}

function inlineToMarkdown(
  nodes: DocNode[] | undefined,
  resolveEntity: (entityId: string, fallback: string) => string,
): string {
  if (!nodes) return '';
  return nodes
    .map((node) => {
      if (node.type === 'entityReference') {
        const entityId = String(node.attrs?.entityId ?? '');
        const fallback = String(node.attrs?.label ?? 'entity');
        return `[[${resolveEntity(entityId, fallback)}]]`;
      }
      if (node.type === 'hardBreak') return '\n';
      if (node.type !== 'text' || !node.text) return '';
      return applyMarks(node.text, node.marks ?? []);
    })
    .join('');
}

function applyMarks(text: string, marks: Array<{ type: string; attrs?: Record<string, unknown> }>): string {
  let result = text;
  for (const mark of marks) {
    if (mark.type === 'bold') result = `**${result}**`;
    else if (mark.type === 'italic') result = `*${result}*`;
    else if (mark.type === 'strike') result = `~~${result}~~`;
    else if (mark.type === 'code') result = `\`${result}\``;
    else if (mark.type === 'link') result = `[${result}](${String(mark.attrs?.href ?? '')})`;
    // Underline has no CommonMark equivalent — the emphasis is dropped, not the text.
  }
  return result;
}
