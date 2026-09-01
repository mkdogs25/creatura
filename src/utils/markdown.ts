import type { RichContent } from '@/types/domain';

/**
 * A small, dependency-free markdown reader for imported notes.
 *
 * This is not a CommonMark implementation — it covers the subset that
 * ordinary notes actually use (headings, paragraphs, bold/italic/strike/code,
 * links, lists, block quotes, fences, rules) and maps it directly onto the
 * node and mark types the manuscript editor already supports. Anything it
 * doesn't recognise falls through as plain paragraph text rather than being
 * dropped, so an import never loses content, only formatting.
 */

interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

// Ordered so longer/more specific tokens are tried before their prefixes
// (**bold** before *italic*, so "**x**" isn't read as italic("*x*") + stray *).
const INLINE_TOKEN = /(`[^`\n]+`)|(!?\[[^\]\n]*\]\([^)\n]+\))|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(~~[^~\n]+~~)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;

function parseInline(text: string): DocNode[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const nodes: DocNode[] = [];
  let cursor = 0;

  for (const match of trimmed.matchAll(INLINE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ type: 'text', text: trimmed.slice(cursor, index) });
    const raw = match[0];

    if (raw.startsWith('`')) {
      nodes.push({ type: 'text', text: raw.slice(1, -1), marks: [{ type: 'code' }] });
    } else if (raw.startsWith('[') || raw.startsWith('![')) {
      // Images have no home in this schema; keep the alt/label text as a link
      // to the source rather than silently discarding the reference.
      const linkMatch = raw.match(/^!?\[([^\]]*)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        nodes.push({
          type: 'text',
          text: label || href,
          marks: [{ type: 'link', attrs: { href } }],
        });
      } else {
        nodes.push({ type: 'text', text: raw });
      }
    } else if (raw.startsWith('**') || raw.startsWith('__')) {
      nodes.push({ type: 'text', text: raw.slice(2, -2), marks: [{ type: 'bold' }] });
    } else if (raw.startsWith('~~')) {
      nodes.push({ type: 'text', text: raw.slice(2, -2), marks: [{ type: 'strike' }] });
    } else {
      nodes.push({ type: 'text', text: raw.slice(1, -1), marks: [{ type: 'italic' }] });
    }
    cursor = index + raw.length;
  }
  if (cursor < trimmed.length) nodes.push({ type: 'text', text: trimmed.slice(cursor) });

  return nodes.filter((node) => node.text !== '');
}

function paragraph(text: string): DocNode {
  const inline = parseInline(text);
  return inline.length > 0 ? { type: 'paragraph', content: inline } : { type: 'paragraph' };
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const FENCE = /^```/;
const QUOTE = /^\s*>\s?(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;

/** Parses a markdown string into a Tiptap document. */
export function markdownToDoc(markdown: string): RichContent {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const content: DocNode[] = [];
  let buffer: string[] = [];
  let i = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join(' ').trim();
    buffer = [];
    if (text) content.push(paragraph(text));
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      flush();
      i += 1;
      continue;
    }

    if (FENCE.test(line)) {
      flush();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // skip the closing fence
      content.push({
        type: 'codeBlock',
        content: code.length > 0 ? [{ type: 'text', text: code.join('\n') }] : undefined,
      });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      flush();
      // The editor only renders levels 1-3; anything deeper still reads as a
      // heading rather than silently becoming a paragraph.
      const level = Math.min(heading[1].length, 3);
      content.push({ type: 'heading', attrs: { level }, content: parseInline(heading[2]) });
      i += 1;
      continue;
    }

    if (RULE.test(line) && !BULLET.test(line)) {
      flush();
      content.push({ type: 'horizontalRule' });
      i += 1;
      continue;
    }

    const quote = line.match(QUOTE);
    if (quote) {
      flush();
      const quoted: string[] = [quote[1]];
      i += 1;
      while (i < lines.length) {
        const next = lines[i].match(QUOTE);
        if (!next) break;
        quoted.push(next[1]);
        i += 1;
      }
      content.push({ type: 'blockquote', content: [paragraph(quoted.join(' '))] });
      continue;
    }

    if (BULLET.test(line)) {
      flush();
      const items: DocNode[] = [];
      while (i < lines.length) {
        const item = lines[i].match(BULLET);
        if (!item) break;
        items.push({ type: 'listItem', content: [paragraph(item[1])] });
        i += 1;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    if (ORDERED.test(line)) {
      flush();
      const items: DocNode[] = [];
      while (i < lines.length) {
        const item = lines[i].match(ORDERED);
        if (!item) break;
        items.push({ type: 'listItem', content: [paragraph(item[1])] });
        i += 1;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }

    buffer.push(line.trim());
    i += 1;
  }

  flush();
  if (content.length === 0) content.push({ type: 'paragraph' });

  return { type: 'doc', content } as unknown as RichContent;
}

/** Strips a markdown/text extension and tidies separators into a note title. */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.(md|markdown|mdown|txt)$/i, '');
  const spaced = base.replace(/[-_]+/g, ' ').trim();
  return spaced || 'Untitled note';
}
