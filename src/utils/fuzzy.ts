/**
 * Small subsequence matcher used by global search and the command palette.
 *
 * Scoring favours, in order: exact prefix, word-boundary starts, then runs of
 * consecutive characters. That ordering is what makes `@El` put "Elysia"
 * above "Kael" even though both contain the letters.
 */
export interface FuzzyMatch {
  score: number;
  /** Indices in the haystack that matched, for highlighting. */
  indices: number[];
}

export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t.startsWith(q)) {
    return {
      score: 1000 - target.length,
      indices: Array.from({ length: q.length }, (_, i) => i),
    };
  }

  const wordStart = t.indexOf(q);
  if (wordStart > 0 && /[\s\-_/]/.test(t[wordStart - 1] ?? '')) {
    return {
      score: 800 - target.length,
      indices: Array.from({ length: q.length }, (_, i) => wordStart + i),
    };
  }
  if (wordStart !== -1) {
    return {
      score: 600 - wordStart - target.length * 0.1,
      indices: Array.from({ length: q.length }, (_, i) => wordStart + i),
    };
  }

  // Fall back to a scattered subsequence match.
  const indices: number[] = [];
  let ti = 0;
  let score = 200;
  let lastIndex = -2;
  for (let qi = 0; qi < q.length; qi += 1) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) return null;
    if (found === lastIndex + 1) score += 8;
    if (found === 0 || /[\s\-_/]/.test(t[found - 1] ?? '')) score += 12;
    indices.push(found);
    lastIndex = found;
    ti = found + 1;
  }
  return { score: score - target.length * 0.1, indices };
}

export function fuzzyRank<T>(
  query: string,
  items: T[],
  keyOf: (item: T) => string,
  limit = 40,
): Array<{ item: T; match: FuzzyMatch }> {
  const scored: Array<{ item: T; match: FuzzyMatch }> = [];
  for (const item of items) {
    const match = fuzzyMatch(query, keyOf(item));
    if (match) scored.push({ item, match });
  }
  scored.sort((a, b) => b.match.score - a.match.score);
  return scored.slice(0, limit);
}
