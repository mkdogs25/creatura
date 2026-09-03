import type { ProjectBundle } from '@/types/domain';
import { allDocs, folderPath } from '@/store/selectors';
import { fuzzyMatch } from '@/utils/fuzzy';
import { snippetAround } from '@/utils/text';

export type SearchResultType =
  | 'character'
  | 'location'
  | 'creature'
  | 'tech'
  | 'note'
  | 'folder'
  | 'event'
  | 'tag'
  | 'chapter';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  /** Folder path or other locating context. */
  path: string;
  snippet: string;
  score: number;
}

const TYPE_WEIGHT: Record<SearchResultType, number> = {
  character: 6,
  location: 5,
  chapter: 5,
  creature: 4,
  tech: 4,
  note: 4,
  event: 4,
  folder: 2,
  tag: 1,
};

/**
 * Searches every kind of record in a project at once.
 *
 * Names are matched fuzzily and rank highest; body text and metadata values
 * are matched as substrings and rank below, so typing a character's name never
 * buries them under notes that merely mention them.
 */
export function searchProject(
  bundle: ProjectBundle | null,
  query: string,
  limit = 40,
): SearchResult[] {
  if (!bundle || !query.trim()) return [];
  const q = query.trim();
  const lower = q.toLowerCase();
  const results: SearchResult[] = [];

  for (const doc of allDocs(bundle)) {
    const path = folderPath(bundle, doc.folderId).map((folder) => folder.name).join(' / ');
    const nameMatch = fuzzyMatch(q, doc.name);
    const bodyIndex = doc.excerpt.toLowerCase().indexOf(lower);
    const fieldHit = doc.fields.find(
      (field) =>
        field.value.toLowerCase().includes(lower) || field.label.toLowerCase().includes(lower),
    );

    if (nameMatch) {
      results.push({
        id: doc.id,
        type: doc.kind,
        title: doc.name,
        path: path || 'Top level',
        snippet: doc.excerpt.slice(0, 110),
        score: nameMatch.score + TYPE_WEIGHT[doc.kind] * 10,
      });
    } else if (bodyIndex !== -1) {
      results.push({
        id: doc.id,
        type: doc.kind,
        title: doc.name,
        path: path || 'Top level',
        snippet: snippetAround(doc.excerpt, q),
        score: 150 + TYPE_WEIGHT[doc.kind],
      });
    } else if (fieldHit) {
      results.push({
        id: doc.id,
        type: doc.kind,
        title: doc.name,
        path: path || 'Top level',
        snippet: `${fieldHit.label}: ${fieldHit.value}`,
        score: 140 + TYPE_WEIGHT[doc.kind],
      });
    }
  }

  for (const folder of bundle.folders) {
    const match = fuzzyMatch(q, folder.name);
    if (!match) continue;
    const path = folderPath(bundle, folder.parentId).map((f) => f.name).join(' / ');
    results.push({
      id: folder.id,
      type: 'folder',
      title: folder.name,
      path: path || 'Top level',
      snippet: 'Folder',
      score: match.score + TYPE_WEIGHT.folder * 10,
    });
  }

  for (const event of bundle.events) {
    const match = fuzzyMatch(q, event.title);
    const summaryHit = event.summary.toLowerCase().includes(lower);
    if (!match && !summaryHit) continue;
    results.push({
      id: event.id,
      type: 'event',
      title: event.title,
      path: 'Timeline',
      snippet: summaryHit ? snippetAround(event.summary, q) : event.summary.slice(0, 110),
      score: (match?.score ?? 150) + TYPE_WEIGHT.event * 10,
    });
  }

  for (const chapter of bundle.chapters) {
    const match = fuzzyMatch(q, chapter.title);
    const bodyIndex = chapter.excerpt.toLowerCase().indexOf(lower);
    if (!match && bodyIndex === -1) continue;
    results.push({
      id: chapter.id,
      type: 'chapter',
      title: chapter.title,
      path: 'Manuscript',
      snippet: match ? chapter.excerpt.slice(0, 110) : snippetAround(chapter.excerpt, q),
      score: (match?.score ?? 150) + TYPE_WEIGHT.chapter * 10,
    });
  }

  for (const tag of bundle.tags) {
    const match = fuzzyMatch(q.replace(/^#/, ''), tag.name);
    if (!match) continue;
    const count = allDocs(bundle).filter((doc) => doc.tagIds.includes(tag.id)).length;
    results.push({
      id: tag.id,
      type: 'tag',
      title: `#${tag.name}`,
      path: 'Tag',
      snippet: `${count} ${count === 1 ? 'entry' : 'entries'}`,
      score: match.score + TYPE_WEIGHT.tag * 10,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
