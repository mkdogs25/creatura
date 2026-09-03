import type {
  AnyDoc,
  Folder,
  ManuscriptChapter,
  MatrixCell,
  ProjectBundle,
  Relationship,
  TimelineEvent,
} from '@/types/domain';

/** All documents across every table, in one list. */
export function allDocs(bundle: ProjectBundle | null): AnyDoc[] {
  if (!bundle) return [];
  return [
    ...bundle.characters,
    ...bundle.locations,
    ...bundle.creatures,
    ...bundle.tech,
    ...bundle.notes,
  ];
}

export function docById(bundle: ProjectBundle | null, id: string | null): AnyDoc | null {
  if (!bundle || !id) return null;
  return (
    bundle.characters.find((d) => d.id === id) ??
    bundle.locations.find((d) => d.id === id) ??
    bundle.creatures.find((d) => d.id === id) ??
    bundle.tech.find((d) => d.id === id) ??
    bundle.notes.find((d) => d.id === id) ??
    null
  );
}

/** Chapters in reading order — the sidebar and the running total both rely on this. */
export function orderedChapters(bundle: ProjectBundle | null): ManuscriptChapter[] {
  if (!bundle) return [];
  return [...bundle.chapters].sort((a, b) => a.order - b.order);
}

export function chapterById(
  bundle: ProjectBundle | null,
  id: string | null,
): ManuscriptChapter | null {
  if (!bundle || !id) return null;
  return bundle.chapters.find((c) => c.id === id) ?? null;
}

/** Name for any referenced id, or null when the target no longer exists. */
export function nameOf(bundle: ProjectBundle | null, id: string | null): string | null {
  if (!bundle || !id) return null;
  const doc = docById(bundle, id);
  if (doc) return doc.name;
  const folder = bundle.folders.find((f) => f.id === id);
  if (folder) return folder.name;
  const event = bundle.events.find((e) => e.id === id);
  if (event) return event.title;
  const tag = bundle.tags.find((t) => t.id === id);
  if (tag) return `#${tag.name}`;
  const pov = bundle.povs.find((p) => p.id === id);
  if (pov) return pov.name;
  return null;
}

/** Ancestor chain for a folder, outermost first. */
export function folderPath(bundle: ProjectBundle | null, folderId: string | null): Folder[] {
  if (!bundle || !folderId) return [];
  const byId = new Map(bundle.folders.map((f) => [f.id, f]));
  const path: Folder[] = [];
  const seen = new Set<string>();
  let cursor: string | null = folderId;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const folder: Folder | undefined = byId.get(cursor);
    if (!folder) break;
    path.unshift(folder);
    cursor = folder.parentId;
  }
  return path;
}

export function childFolders(bundle: ProjectBundle | null, parentId: string | null): Folder[] {
  if (!bundle) return [];
  return bundle.folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function docsInFolder(bundle: ProjectBundle | null, folderId: string | null): AnyDoc[] {
  return allDocs(bundle)
    .filter((doc) => doc.folderId === folderId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** Recursive item count for a folder, used for the tree's count badges. */
export function folderItemCount(bundle: ProjectBundle | null, folderId: string): number {
  if (!bundle) return 0;
  const docs = allDocs(bundle);
  let total = docs.filter((doc) => doc.folderId === folderId).length;
  for (const child of bundle.folders.filter((f) => f.parentId === folderId)) {
    total += folderItemCount(bundle, child.id);
  }
  return total;
}

export function relationshipsFor(
  bundle: ProjectBundle | null,
  entityId: string,
): Array<{ relationship: Relationship; otherId: string; outgoing: boolean }> {
  if (!bundle) return [];
  const out: Array<{ relationship: Relationship; otherId: string; outgoing: boolean }> = [];
  for (const relationship of bundle.relationships) {
    if (relationship.fromId === entityId) {
      out.push({ relationship, otherId: relationship.toId, outgoing: true });
    } else if (relationship.toId === entityId) {
      out.push({ relationship, otherId: relationship.fromId, outgoing: false });
    }
  }
  return out;
}

export function eventsForEntity(
  bundle: ProjectBundle | null,
  entityId: string,
): TimelineEvent[] {
  if (!bundle) return [];
  return bundle.events
    .filter(
      (event) =>
        event.characterIds.includes(entityId) || event.locationIds.includes(entityId),
    )
    .sort((a, b) => a.start - b.start);
}

/** Locations a character appears in, derived from shared timeline events. */
export function locationsForCharacter(
  bundle: ProjectBundle | null,
  characterId: string,
): string[] {
  if (!bundle) return [];
  const ids = new Set<string>();
  for (const event of bundle.events) {
    if (!event.characterIds.includes(characterId)) continue;
    event.locationIds.forEach((id) => ids.add(id));
  }
  for (const relationship of bundle.relationships) {
    if (relationship.fromId === characterId) ids.add(relationship.toId);
    if (relationship.toId === characterId) ids.add(relationship.fromId);
  }
  return [...ids].filter((id) => bundle.locations.some((l) => l.id === id));
}

export interface MatrixIntersection {
  characterId: string;
  locationId: string;
  events: TimelineEvent[];
  relationships: Relationship[];
  cell: MatrixCell | null;
  /** Any signal at all — decides whether the grid cell reads as populated. */
  weight: number;
}

/**
 * Everything known about one Character × Location pairing. Events and
 * relationships are derived live from project data; only `cell` is authored.
 */
export function intersection(
  bundle: ProjectBundle | null,
  characterId: string,
  locationId: string,
): MatrixIntersection {
  if (!bundle) {
    return { characterId, locationId, events: [], relationships: [], cell: null, weight: 0 };
  }
  const events = bundle.events
    .filter(
      (event) =>
        event.characterIds.includes(characterId) && event.locationIds.includes(locationId),
    )
    .sort((a, b) => a.start - b.start);

  const relationships = bundle.relationships.filter(
    (rel) =>
      (rel.fromId === characterId && rel.toId === locationId) ||
      (rel.fromId === locationId && rel.toId === characterId),
  );

  const cell =
    bundle.cells.find(
      (c) => c.characterId === characterId && c.locationId === locationId,
    ) ?? null;

  const authored = cell && (cell.status || cell.note || cell.tagIds.length > 0) ? 1 : 0;
  return {
    characterId,
    locationId,
    events,
    relationships,
    cell,
    weight: events.length + relationships.length + authored,
  };
}

export interface ProjectStats {
  notes: number;
  characters: number;
  locations: number;
  creatures: number;
  tech: number;
  folders: number;
  events: number;
  tags: number;
  relationships: number;
  povs: number;
  maps: number;
  chapters: number;
  /** Manuscript word count alone — the number that actually matters while drafting. */
  manuscriptWords: number;
  /** Manuscript plus every worldbuilding doc's words, for a whole-project total. */
  words: number;
}

export function projectStats(bundle: ProjectBundle | null): ProjectStats {
  if (!bundle) {
    return {
      notes: 0,
      characters: 0,
      locations: 0,
      creatures: 0,
      tech: 0,
      folders: 0,
      events: 0,
      tags: 0,
      relationships: 0,
      povs: 0,
      maps: 0,
      chapters: 0,
      manuscriptWords: 0,
      words: 0,
    };
  }
  const docs = allDocs(bundle);
  const manuscriptWords = bundle.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  return {
    notes: bundle.notes.length,
    characters: bundle.characters.length,
    locations: bundle.locations.length,
    creatures: bundle.creatures.length,
    tech: bundle.tech.length,
    folders: bundle.folders.length,
    events: bundle.events.length,
    tags: bundle.tags.length,
    relationships: bundle.relationships.length,
    povs: bundle.povs.length,
    maps: bundle.maps.length,
    chapters: bundle.chapters.length,
    manuscriptWords,
    words: docs.reduce((sum, doc) => sum + doc.wordCount, 0) + manuscriptWords,
  };
}
