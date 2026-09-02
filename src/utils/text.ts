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

/**
 * Flattens a Tiptap document to plain text. Entity references contribute the
 * label that was current when they were written, which is fine for search
 * snippets — the canonical name is always re-resolved at render time.
 */
export function docToPlainText(doc: RichContent | null | undefined): string {
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
      // Block-level nodes get a space so words don't run together.
      if (n.type !== 'text') parts.push(' ');
    }
  };

  walk(doc);
  return parts.join('').replace(/\s+/g, ' ').trim();
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
