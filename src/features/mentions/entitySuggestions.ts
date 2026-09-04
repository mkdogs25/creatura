import { docToPlainText } from '@/utils/text';
import type { AnyDoc, Profile, RichContent } from '@/types/domain';

type NameSource = Pick<AnyDoc, 'kind' | 'name'> & { profile?: unknown };

/**
 * Expands a project's character/location names into every first/last-word
 * part too — "Elysia" and "Ambrose" alongside "Elysia Ambrose" — so a
 * suggestion for the existing entity's own first name never resurfaces just
 * because the prose happens to use it alone. Notes are left whole (a note's
 * title fragmenting into "known names" would just as often hide a real,
 * still-uncreated character who happens to share a word with it).
 *
 * A character's structured profile — when filled in — expands this further
 * into every title/first/last combination ("Professor Oshira", "Professor
 * Bristol Oshira", "Bristol"…): without it, those all read as different
 * people, since a bare name split can't know "Professor" isn't part of one.
 */
export function expandKnownNames(docs: NameSource[]): string[] {
  const names = new Set<string>();
  for (const doc of docs) {
    names.add(doc.name);
    if (doc.kind !== 'character' && doc.kind !== 'location') continue;
    const words = doc.name.trim().split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      names.add(words[0]);
      names.add(words[words.length - 1]);
    }

    if (doc.kind !== 'character' || !doc.profile) continue;
    const { title, firstName, middleName, lastName } = doc.profile as Profile;
    if (firstName) names.add(firstName);
    if (lastName) names.add(lastName);
    if (firstName && lastName) names.add(`${firstName} ${lastName}`);
    if (firstName && middleName && lastName) names.add(`${firstName} ${middleName} ${lastName}`);
    if (title && lastName) names.add(`${title} ${lastName}`);
    if (title && firstName) names.add(`${title} ${firstName}`);
    if (title && firstName && lastName) names.add(`${title} ${firstName} ${lastName}`);
  }
  return [...names];
}

/**
 * Words that are capitalized often enough (sentence starters, pronouns,
 * common adverbs) that treating them as proper-noun candidates would be pure
 * noise. Checked against the first word of each candidate only, so a real
 * two-word name like "The Reaper" — unlikely, but possible — is still caught
 * because "Reaper" alone would also repeat.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'but', 'or', 'nor', 'so', 'yet', 'if', 'when', 'while', 'as', 'because',
  'although', 'though', 'once', 'until', 'unless', 'since',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'his', 'her', 'its', 'their', 'our', 'your', 'my',
  'him', 'them', 'us', 'me',
  'this', 'that', 'these', 'those', 'there', 'here', 'then', 'now', 'yes', 'no', 'oh', 'well', 'okay', 'ok',
  'in', 'on', 'at', 'of', 'for', 'with', 'to', 'from', 'by', 'about', 'into', 'onto', 'over', 'under',
  'after', 'before', 'above', 'below', 'behind', 'beyond', 'across', 'around', 'through', 'against',
  'later', 'earlier', 'suddenly', 'meanwhile', 'eventually', 'finally', 'slowly', 'quietly', 'quickly',
  'perhaps', 'maybe', 'somehow', 'somewhere', 'anywhere', 'nowhere', 'everywhere',
  'something', 'someone', 'somebody', 'everything', 'everyone', 'everybody',
  'nothing', 'nobody', 'anything', 'anyone', 'anybody',
  'still', 'even', 'also', 'again', 'never', 'always', 'just', 'only', 'not',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
  'november', 'december',
  'mr', 'mrs', 'ms', 'dr', 'chapter', 'part', 'book', 'prologue', 'epilogue',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
]);

const NAME_PATTERN = /\b[A-Z][a-zA-Z'’-]*(?:\s+[A-Z][a-zA-Z'’-]*)?\b/g;

/** A trimmed span of prose ends with terminal punctuation (optionally inside
 * closing quotes/brackets) — the mark of a sentence, heading or list item
 * boundary, i.e. the next word is capitalized because of its position, not
 * because it's a proper noun. */
const SENTENCE_END = /[.!?…:][)\]"'”’]*$/;

export interface NameCandidate {
  name: string;
  count: number;
}

/**
 * Scans plain prose for capitalized words or two-word phrases repeated often
 * enough to plausibly be a character or place — one that hasn't been created
 * yet, since anything in `knownNames` (existing entities, by name) is
 * excluded.
 *
 * Sentence-initial capitals are the main source of noise ("Harnessing the
 * wind, she..."; a lone "I"). A single mid-sentence occurrence — a dialogue
 * tag, "with Kael", "asked Elysia" — is far stronger evidence than any number
 * of sentence-initial ones, so a candidate needs only `minCount` repeats once
 * it has shown up mid-sentence even once, but a much higher bar
 * (`minCount + 2`) when every occurrence happens to open a sentence, which is
 * where a topic sentence's opening word or a heading keeps landing rather
 * than a name. ALL-CAPS tokens (acronyms like "AI", "OK") and anything under
 * three letters are dropped outright, which is what filters out a lone "I".
 *
 * This is a heuristic, not a parser: it will occasionally miss a name used
 * only in narration at the start of sentences, and it will occasionally flag
 * something that isn't a name. Both are fine — the suggestion is a nudge,
 * not an assertion, and a false positive costs one click to ignore.
 */
export function detectNameCandidates(
  content: RichContent | null | undefined,
  knownNames: ReadonlySet<string>,
  minCount = 2,
): NameCandidate[] {
  const text = docToPlainText(content);
  if (!text) return [];

  const counts = new Map<string, { name: string; count: number; midCount: number }>();
  NAME_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAME_PATTERN.exec(text))) {
    // Strip a trailing possessive or contraction ("Elysia's" -> "Elysia",
    // "It's" -> "It") before anything else touches the match. Left in place,
    // a possessive of an already-known name never matches `knownNames`
    // (only the bare name is in it) and re-triggers a "create" suggestion
    // for someone who already exists; a contraction like "It's"/"That's"
    // also stops matching its own stopword ("it"/"that"), since the pattern
    // allows apostrophes inside a word and the suffix survives untouched.
    const raw = match[0].trim().replace(/['’](?:s|re|ll|ve|d|m)?$/i, '');
    if (raw.length < 2) continue;
    const words = raw.split(/\s+/);

    // A leading stopword ("Then Zorathia") never demotes the whole match —
    // fall back to the word that follows, since that's the actual candidate
    // and dropping the pair entirely would silently undercount real names
    // that happen to follow a capitalized sentence-starter.
    let candidate = raw;
    if (STOPWORDS.has(words[0].toLowerCase())) {
      if (words.length < 2) continue;
      candidate = words.slice(1).join(' ');
      // The fallback word can be a stopword too ("Chapter One", "The Then") —
      // a heading or another function word, not a name recovering from a
      // capitalized sentence-starter. Drop it rather than flagging it.
      if (STOPWORDS.has(candidate.split(/\s+/)[0].toLowerCase())) continue;
    }

    if (candidate.length < 3) continue;
    if (candidate === candidate.toUpperCase()) continue; // acronym/interjection, not a name

    const before = text.slice(0, match.index).trimEnd();
    const sentenceInitial = before.length === 0 || SENTENCE_END.test(before);

    const key = candidate.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      if (!sentenceInitial) existing.midCount += 1;
    } else {
      counts.set(key, { name: candidate, count: 1, midCount: sentenceInitial ? 0 : 1 });
    }
  }

  return [...counts.values()]
    .filter((candidate) => {
      if (knownNames.has(candidate.name.toLowerCase())) return false;
      const required = candidate.midCount > 0 ? minCount : minCount + 2;
      return candidate.count >= required;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(({ name, count }) => ({ name, count }));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Re-points every `entityReference` node in `content` that targets `oldId`
 * at `newId` instead — used when a document's id changes out from under it
 * (converting a note into a category swaps in a fresh, kind-prefixed id, the
 * same way `deleteDoc` severs references on delete, except here the target
 * still exists so the link is repointed rather than left dangling).
 *
 * Returns the original object unchanged (same reference) when nothing
 * matched, so callers can cheaply tell whether a document actually needs
 * re-saving.
 */
export function remapEntityReference(
  content: RichContent,
  oldId: string,
  newId: string,
): RichContent {
  const walk = (node: unknown): unknown => {
    if (!node || typeof node !== 'object') return node;
    const n = node as { type?: string; attrs?: unknown; content?: unknown[]; [key: string]: unknown };

    if (n.type === 'entityReference' && n.attrs && typeof n.attrs === 'object') {
      const attrs = n.attrs as Record<string, unknown>;
      if (attrs.entityId === oldId) {
        return { ...n, attrs: { ...attrs, entityId: newId } };
      }
    }

    if (Array.isArray(n.content)) {
      let changed = false;
      const nextContent = n.content.map((child) => {
        const result = walk(child);
        if (result !== child) changed = true;
        return result;
      });
      if (changed) return { ...n, content: nextContent };
    }

    return n;
  };

  return walk(content) as RichContent;
}

/**
 * Rewrites every whole-word occurrence of `name` in prose text nodes into an
 * `entityReference` pointing at `entityId` — turning "noticed a repeated
 * name" into an actually-linked mention rather than just a created, unlinked
 * entity.
 *
 * Only text nodes are touched; anything already an entity reference (or any
 * other node) passes through unchanged, so this is safe to run repeatedly.
 */
export function linkEntityInContent(
  content: RichContent,
  name: string,
  entityId: string,
): RichContent {
  const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g');

  const walk = (node: unknown): unknown => {
    if (!node || typeof node !== 'object') return node;
    const n = node as {
      type?: string;
      text?: string;
      marks?: unknown;
      content?: unknown[];
      [key: string]: unknown;
    };

    if (n.type === 'text' && typeof n.text === 'string') {
      if (!pattern.test(n.text)) return n;
      pattern.lastIndex = 0;
      const segments: unknown[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(n.text))) {
        if (match.index > lastIndex) {
          segments.push({
            type: 'text',
            text: n.text.slice(lastIndex, match.index),
            ...(n.marks ? { marks: n.marks } : {}),
          });
        }
        segments.push({ type: 'entityReference', attrs: { entityId, label: match[0] } });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < n.text.length) {
        segments.push({
          type: 'text',
          text: n.text.slice(lastIndex),
          ...(n.marks ? { marks: n.marks } : {}),
        });
      }
      return segments;
    }

    if (Array.isArray(n.content)) {
      const nextContent: unknown[] = [];
      for (const child of n.content) {
        const result = walk(child);
        if (Array.isArray(result)) nextContent.push(...result);
        else nextContent.push(result);
      }
      return { ...n, content: nextContent };
    }

    return n;
  };

  return walk(content) as RichContent;
}
