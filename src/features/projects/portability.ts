import { projectExportSchema } from '@/db/schemas';
import { SCHEMA_VERSION } from '@/types/domain';
import type {
  CharacterDoc,
  LocationDoc,
  NoteDoc,
  ProjectBundle,
  ProjectExport,
  RichContent,
} from '@/types/domain';
import { loadProjectBundle } from '@/db/repositories/projectRepository';
import { newId, kindOfId } from '@/utils/id';

/** Serialises a project into the portable export shape. */
export function bundleToExport(bundle: ProjectBundle): ProjectExport {
  return {
    format: 'creatura-project',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    project: bundle.project,
    folders: bundle.folders,
    characters: bundle.characters,
    locations: bundle.locations,
    notes: bundle.notes,
    tags: bundle.tags,
    relationships: bundle.relationships,
    events: bundle.events,
    sections: bundle.sections,
    povs: bundle.povs,
    maps: bundle.maps,
    markers: bundle.markers,
    cells: bundle.cells,
  };
}

export async function exportProjectById(projectId: string): Promise<string | null> {
  const bundle = await loadProjectBundle(projectId);
  if (!bundle) return null;
  return JSON.stringify(bundleToExport(bundle), null, 2);
}

export function filenameFor(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${slug || 'project'}.creatura.json`;
}

export interface ImportResult {
  ok: boolean;
  bundle?: ProjectBundle;
  /** Non-fatal repairs made while reading the file, surfaced to the user. */
  warnings: string[];
  error?: string;
}

/**
 * Parses and repairs an exported project file.
 *
 * Import is the one place where completely foreign data enters the database,
 * so it does four things beyond schema validation: it refuses an incompatible
 * future version, it re-issues every id to avoid colliding with an existing
 * project, it drops duplicate ids within the file, and it severs references
 * that point at records the file does not contain.
 */
export function parseProjectFile(text: string): ImportResult {
  const warnings: string[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, warnings, error: 'That file is not valid JSON.' };
  }

  const candidate = raw as { format?: unknown; schemaVersion?: unknown };
  if (candidate?.format !== 'creatura-project') {
    return {
      ok: false,
      warnings,
      error: 'That file is not a Creatura project export.',
    };
  }
  if (typeof candidate.schemaVersion === 'number' && candidate.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      warnings,
      error: `This file was written by a newer version of Creatura (schema ${candidate.schemaVersion}). Update Creatura to open it.`,
    };
  }

  const parsed = projectExportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      warnings,
      error: 'The project file is missing required information and cannot be read.',
    };
  }

  const data = parsed.data as ProjectExport;

  // Fresh ids throughout: importing the same file twice yields two independent
  // projects rather than one silently overwriting the other.
  const idMap = new Map<string, string>();
  const seen = new Set<string>();
  const claim = (oldId: string): string | null => {
    if (seen.has(oldId)) {
      warnings.push('Duplicate ids in the file — the repeated records were dropped.');
      return null;
    }
    seen.add(oldId);
    const kind = kindOfId(oldId);
    const fresh = newId(kind ?? 'note');
    idMap.set(oldId, fresh);
    return fresh;
  };

  const projectId = newId('project');
  idMap.set(data.project.id, projectId);

  const dedupe = <T extends { id: string }>(rows: T[]): T[] => {
    const out: T[] = [];
    for (const row of rows) {
      const fresh = claim(row.id);
      if (fresh) out.push({ ...row, id: fresh, projectId } as T);
    }
    return out;
  };

  const folders = dedupe(data.folders);
  const characters = dedupe(data.characters);
  const locations = dedupe(data.locations);
  const notes = dedupe(data.notes);
  const tags = dedupe(data.tags);
  const relationships = dedupe(data.relationships);
  const events = dedupe(data.events);
  const sections = dedupe(data.sections);
  const povs = dedupe(data.povs);
  const maps = dedupe(data.maps);
  const markers = dedupe(data.markers);
  const cells = dedupe(data.cells);

  /** Resolves an old id, or null when the file never contained the target. */
  const ref = (oldId: string | null | undefined): string | null =>
    oldId ? (idMap.get(oldId) ?? null) : null;

  const refs = (ids: string[]): string[] => {
    const resolved = ids.map(ref).filter((id): id is string => id !== null);
    if (resolved.length !== ids.length) {
      warnings.push('Some references pointed at records missing from the file and were removed.');
    }
    return resolved;
  };

  const remapContent = (content: unknown): unknown => {
    if (Array.isArray(content)) return content.map(remapContent);
    if (!content || typeof content !== 'object') return content;
    const node = content as Record<string, unknown>;
    const next: Record<string, unknown> = { ...node };
    if (node.type === 'entityReference' && node.attrs && typeof node.attrs === 'object') {
      const attrs = node.attrs as Record<string, unknown>;
      if (typeof attrs.entityId === 'string') {
        // A reference to something not in the file keeps its dangling id, so
        // it renders as an explicit unresolved token rather than vanishing.
        next.attrs = { ...attrs, entityId: idMap.get(attrs.entityId) ?? attrs.entityId };
      }
    }
    if (Array.isArray(node.content)) next.content = node.content.map(remapContent);
    return next;
  };

  /** Re-points a document's folder, tags and inline references. */
  const fixDoc = <T extends CharacterDoc | LocationDoc | NoteDoc>(doc: T): T => ({
    ...doc,
    folderId: ref(doc.folderId),
    tagIds: doc.tagIds.map(ref).filter((id): id is string => id !== null),
    content: remapContent(doc.content) as RichContent,
  });

  const bundle: ProjectBundle = {
    project: {
      ...data.project,
      id: projectId,
      schemaVersion: SCHEMA_VERSION,
      archived: false,
      lastOpenedAt: Date.now(),
      updatedAt: Date.now(),
    },
    folders: folders.map((folder) => ({ ...folder, parentId: ref(folder.parentId) })),
    characters: characters.map(fixDoc),
    locations: locations.map((location) => ({
      ...fixDoc(location),
      mapId: ref(location.mapId),
    })),
    notes: notes.map(fixDoc),
    tags,
    relationships: relationships.flatMap((relationship) => {
      const fromId = ref(relationship.fromId);
      const toId = ref(relationship.toId);
      if (!fromId || !toId) {
        warnings.push('Relationships referring to missing records were dropped.');
        return [];
      }
      return [{ ...relationship, fromId, toId }];
    }),
    events: events.map((event) => ({
      ...event,
      povId: ref(event.povId),
      characterIds: refs(event.characterIds),
      locationIds: refs(event.locationIds),
      tagIds: refs(event.tagIds),
      relatedEventIds: refs(event.relatedEventIds),
    })),
    sections,
    povs: povs.map((pov) => ({ ...pov, characterId: ref(pov.characterId) })),
    maps,
    markers: markers.flatMap((marker) => {
      const mapId = ref(marker.mapId);
      if (!mapId) return [];
      return [{ ...marker, mapId, locationId: ref(marker.locationId) }];
    }),
    cells: cells.flatMap((cell) => {
      const characterId = ref(cell.characterId);
      const locationId = ref(cell.locationId);
      if (!characterId || !locationId) return [];
      return [
        {
          ...cell,
          characterId,
          locationId,
          tagIds: cell.tagIds.map(ref).filter((id): id is string => id !== null),
        },
      ];
    }),
  };

  return { ok: true, bundle, warnings: [...new Set(warnings)] };
}
