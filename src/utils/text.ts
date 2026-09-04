import type { RichContent } from '@/types/domain';

/** The first word of a name — "Elysia" from "Elysia Ambrose", or the whole
 * string unchanged when it's a single word. */
export function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Dotted lowercase initials — "e.a." from "Elysia Ambrose". */
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toLowerCase())
    .filter((letter): letter is string => Boolean(letter));
  return letters.length > 0 ? `${letters.join('.')}.` : '';
}

/** Walks a Tiptap document's text and entity-reference nodes, joining each
 * block-level node (paragraph, heading, list item…) with `blockSeparator`.
 * Entity references contribute the label that was current when they were
 * written — fine for search snippets, since the canonical name is always
 * re-resolved at render time. */
function flattenDoc(doc: RichContent | null | undefined, blockSeparator: string): string {
  if (!doc) return '';
  const parts: string[] = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; attrs?: Record<string, unknown>; content?: unknown[] };
    if (n.type === 'text' && typeof n.text === 'string') {
      parts.push(n.text);
    } else if (n.type === 'entityReference') {
      const label = n.attrs?.label;
      parts.push(typeof label === 'string' ? label : '');
    }
    if (Array.isArray(n.content)) {
      n.content.forEach(walk);
      if (n.type !== 'text') parts.push(blockSeparator);
    }
  };

  walk(doc);
  return parts.join('');
}

/** Flattens a Tiptap document to a single run of plain text — every block
 * boundary collapses to one space, which is what search snippets and
 * excerpts want. */
export function docToPlainText(doc: RichContent | null | undefined): string {
  return flattenDoc(doc, ' ').replace(/\s+/g, ' ').trim();
}

/** Like `docToPlainText`, but keeps each block-level node on its own line
 * instead of collapsing everything into one run — needed wherever
 * "Label: value" lines have to stay separately matchable, such as
 * extracting a category's fields out of a note's prose. */
export function docToLines(doc: RichContent | null | undefined): string {
  return flattenDoc(doc, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function makeExcerpt(text: string, length = 240): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}

/** Builds a Tiptap doc containing the given paragraphs. */
export function paragraphsToDoc(paragraphs: string[]): RichContent {
  return {
    type: 'doc',
    content: paragraphs.map((text) =>
      text
        ? { type: 'paragraph', content: [{ type: 'text', text }] }
        : { type: 'paragraph' },
    ),
  };
}

export function emptyDoc(): RichContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

/** Returns `text` with the first match of `query` centred in a short window. */
export function snippetAround(text: string, query: string, radius = 60): string {
  if (!query) return makeExcerpt(text, radius * 2);
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return makeExcerpt(text, radius * 2);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

/** Best-effort "Characters" → "Character" — category names are stored
 * plural ("Characters", "Artifacts"); this recovers a singular for labels
 * like "New Character here" without a separate stored field. Cosmetic
 * only — an irregular plural just reads a little oddly, nothing breaks. */
export function singularize(name: string): string {
  return name.endsWith('s') ? name.slice(0, -1) : name;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function relativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < 45_000) return 'just now';
  const minutes = Math.round(delta / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}
