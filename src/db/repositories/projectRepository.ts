import { supabase } from '@/lib/supabaseClient';
import { toRow, fromRow, fromRows } from '@/lib/caseMapping';
import { PROJECT_TABLES } from '@/db/database';
import {
  chapterSchema,
  characterSchema,
  eventSchema,
  folderSchema,
  locationSchema,
  mapSchema,
  markerSchema,
  matrixCellSchema,
  noteSchema,
  parseAll,
  povSchema,
  projectSchema,
  relationshipSchema,
  sectionSchema,
  settingsSchema,
  tagSchema,
} from '@/db/schemas';
import type {
  CharacterDoc,
  LocationDoc,
  NoteDoc,
  Project,
  ProjectBundle,
  Settings,
} from '@/types/domain';
import { defaultSettings } from '@/data/defaultSettings';

/** Reattaches the `kind` discriminant a doc table doesn't store as a column. */
function withKind<K extends 'character' | 'location' | 'note'>(
  rows: Record<string, unknown>[],
  kind: K,
): Array<Record<string, unknown> & { kind: K }> {
  return rows.map((row) => ({ ...row, kind }));
}

/**
 * Every read goes through Zod so a record written by an older build — or one
 * that got mangled — is repaired or dropped rather than crashing a view.
 */
export async function loadProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*');
  if (error) throw error;
  return parseAll(projectSchema, fromRows(data ?? []), 'project').sort(
    (a, b) => b.lastOpenedAt - a.lastOpenedAt,
  );
}

/** Fetches one project-scoped table's rows, already converted to camelCase. */
async function byProject(table: string, projectId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from(table).select('*').eq('project_id', projectId);
  if (error) throw error;
  return fromRows(data ?? []);
}

export async function loadProjectBundle(projectId: string): Promise<ProjectBundle | null> {
  const { data: projectRow, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!projectRow) return null;
  const parsedProject = projectSchema.safeParse(fromRow(projectRow));
  if (!parsedProject.success) return null;

  const [
    folders,
    characters,
    locations,
    notes,
    tags,
    relationships,
    events,
    sections,
    povs,
    maps,
    markers,
    cells,
    chapters,
  ] = await Promise.all([
    byProject('folders', projectId),
    byProject('characters', projectId),
    byProject('locations', projectId),
    byProject('notes', projectId),
    byProject('tags', projectId),
    byProject('relationships', projectId),
    byProject('events', projectId),
    byProject('sections', projectId),
    byProject('povs', projectId),
    byProject('maps', projectId),
    byProject('markers', projectId),
    byProject('cells', projectId),
    byProject('chapters', projectId),
  ]);

  return {
    project: parsedProject.data,
    folders: parseAll(folderSchema, folders, 'folder'),
    characters: parseAll(
      characterSchema,
      withKind(characters, 'character'),
      'character',
    ) as CharacterDoc[],
    locations: parseAll(
      locationSchema,
      withKind(locations, 'location'),
      'location',
    ) as LocationDoc[],
    notes: parseAll(noteSchema, withKind(notes, 'note'), 'note') as NoteDoc[],
    tags: parseAll(tagSchema, tags, 'tag'),
    relationships: parseAll(relationshipSchema, relationships, 'relationship'),
    events: parseAll(eventSchema, events, 'event'),
    sections: parseAll(sectionSchema, sections, 'section'),
    povs: parseAll(povSchema, povs, 'pov'),
    maps: parseAll(mapSchema, maps, 'map'),
    markers: parseAll(markerSchema, markers, 'marker'),
    cells: parseAll(matrixCellSchema, cells, 'matrix cell'),
    chapters: parseAll(chapterSchema, chapters, 'chapter'),
  };
}

/** Strips a doc's `kind` — not a stored column — before it's sent to its table. */
function stripKind<T extends { kind?: unknown }>(doc: T): Omit<T, 'kind'> {
  const { kind: _kind, ...rest } = doc;
  return rest;
}

async function upsertTable(table: string, rows: unknown[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows.map((row) => toRow(row as object)));
  if (error) throw error;
}

/**
 * Writes an entire bundle. Each table is upserted independently — Supabase's
 * REST interface (unlike the IndexedDB transaction this replaces) has no
 * client-side multi-table transaction, so a failure partway through can
 * leave a partial write; the persistence tracker surfaces that as a save
 * error rather than silently losing it.
 */
export async function saveProjectBundle(bundle: ProjectBundle): Promise<void> {
  const { error: projectError } = await supabase.from('projects').upsert(toRow(bundle.project));
  if (projectError) throw projectError;

  await Promise.all([
    upsertTable('folders', bundle.folders),
    upsertTable('characters', bundle.characters.map(stripKind)),
    upsertTable('locations', bundle.locations.map(stripKind)),
    upsertTable('notes', bundle.notes.map(stripKind)),
    upsertTable('tags', bundle.tags),
    upsertTable('relationships', bundle.relationships),
    upsertTable('events', bundle.events),
    upsertTable('sections', bundle.sections),
    upsertTable('povs', bundle.povs),
    upsertTable('maps', bundle.maps),
    upsertTable('markers', bundle.markers),
    upsertTable('cells', bundle.cells),
    upsertTable('chapters', bundle.chapters),
  ]);
}

export async function putProject(project: Project): Promise<void> {
  const { error } = await supabase.from('projects').upsert(toRow(project));
  if (error) throw error;
}

/** Removes the project row and every record scoped to it (the schema's
 * `on delete cascade` foreign keys take care of the rest in one statement). */
export async function deleteProjectDeep(projectId: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}

/** Empties a project's contents while keeping the project itself. */
export async function clearProjectContents(projectId: string): Promise<void> {
  await Promise.all(
    PROJECT_TABLES.map(async (table) => {
      const { error } = await supabase.from(table).delete().eq('project_id', projectId);
      if (error) throw error;
    }),
  );
}

export async function loadSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
  if (error) throw error;
  const parsed = settingsSchema.safeParse(data ? fromRow(data) : defaultSettings());
  return parsed.success ? (parsed.data as Settings) : defaultSettings();
}

export async function putSettings(settings: Settings): Promise<void> {
  const { error } = await supabase.from('settings').upsert(toRow(settings));
  if (error) throw error;
}
