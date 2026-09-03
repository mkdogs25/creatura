import { db, PROJECT_TABLES } from '@/db/database';
import {
  categorySchema,
  chapterSchema,
  characterSchema,
  creatureSchema,
  customDocSchema,
  eventSchema,
  folderSchema,
  locationSchema,
  mapSchema,
  mapStampSchema,
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
  techSchema,
  terrainStrokeSchema,
} from '@/db/schemas';
import type {
  Category,
  CharacterDoc,
  CreatureDoc,
  CustomDoc,
  LocationDoc,
  NoteDoc,
  Project,
  ProjectBundle,
  Settings,
  TechDoc,
} from '@/types/domain';
import { defaultSettings } from '@/data/defaultSettings';

/**
 * Every read goes through Zod so a record written by an older build — or one
 * that got mangled — is repaired or dropped rather than crashing a view.
 */
export async function loadProjects(): Promise<Project[]> {
  const rows = await db.projects.toArray();
  return parseAll(projectSchema, rows, 'project').sort(
    (a, b) => b.lastOpenedAt - a.lastOpenedAt,
  );
}

export async function loadProjectBundle(projectId: string): Promise<ProjectBundle | null> {
  const projectRow = await db.projects.get(projectId);
  if (!projectRow) return null;
  const parsedProject = projectSchema.safeParse(projectRow);
  if (!parsedProject.success) return null;

  const where = (table: {
    where: (k: string) => { equals: (v: string) => { toArray: () => Promise<unknown[]> } };
  }) => table.where('projectId').equals(projectId).toArray();

  const [
    folders,
    categories,
    characters,
    locations,
    creatures,
    tech,
    customDocs,
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
    terrain,
    stamps,
  ] = await Promise.all([
    where(db.folders),
    where(db.categories),
    where(db.characters),
    where(db.locations),
    where(db.creatures),
    where(db.tech),
    where(db.customDocs),
    where(db.notes),
    where(db.tags),
    where(db.relationships),
    where(db.events),
    where(db.sections),
    where(db.povs),
    where(db.maps),
    where(db.markers),
    where(db.cells),
    where(db.chapters),
    where(db.terrain),
    where(db.stamps),
  ]);

  return {
    project: parsedProject.data,
    folders: parseAll(folderSchema, folders, 'folder'),
    categories: parseAll(categorySchema, categories, 'category') as Category[],
    characters: parseAll(characterSchema, characters, 'character') as CharacterDoc[],
    locations: parseAll(locationSchema, locations, 'location') as LocationDoc[],
    creatures: parseAll(creatureSchema, creatures, 'creature') as CreatureDoc[],
    tech: parseAll(techSchema, tech, 'tech') as TechDoc[],
    customDocs: parseAll(customDocSchema, customDocs, 'custom doc') as CustomDoc[],
    notes: parseAll(noteSchema, notes, 'note') as NoteDoc[],
    tags: parseAll(tagSchema, tags, 'tag'),
    relationships: parseAll(relationshipSchema, relationships, 'relationship'),
    events: parseAll(eventSchema, events, 'event'),
    sections: parseAll(sectionSchema, sections, 'section'),
    povs: parseAll(povSchema, povs, 'pov'),
    maps: parseAll(mapSchema, maps, 'map'),
    markers: parseAll(markerSchema, markers, 'marker'),
    cells: parseAll(matrixCellSchema, cells, 'matrix cell'),
    chapters: parseAll(chapterSchema, chapters, 'chapter'),
    terrain: parseAll(terrainStrokeSchema, terrain, 'terrain stroke'),
    stamps: parseAll(mapStampSchema, stamps, 'stamp'),
  };
}

/** Writes an entire bundle in one transaction — used by create and import. */
export async function saveProjectBundle(bundle: ProjectBundle): Promise<void> {
  await db.transaction(
    'rw',
    [db.projects, ...PROJECT_TABLES.map((name) => db[name])],
    async () => {
      await db.projects.put(bundle.project);
      await db.folders.bulkPut(bundle.folders);
      await db.categories.bulkPut(bundle.categories);
      await db.characters.bulkPut(bundle.characters);
      await db.locations.bulkPut(bundle.locations);
      await db.creatures.bulkPut(bundle.creatures);
      await db.tech.bulkPut(bundle.tech);
      await db.customDocs.bulkPut(bundle.customDocs);
      await db.notes.bulkPut(bundle.notes);
      await db.tags.bulkPut(bundle.tags);
      await db.relationships.bulkPut(bundle.relationships);
      await db.events.bulkPut(bundle.events);
      await db.sections.bulkPut(bundle.sections);
      await db.povs.bulkPut(bundle.povs);
      await db.maps.bulkPut(bundle.maps);
      await db.markers.bulkPut(bundle.markers);
      await db.cells.bulkPut(bundle.cells);
      await db.chapters.bulkPut(bundle.chapters);
      await db.terrain.bulkPut(bundle.terrain);
      await db.stamps.bulkPut(bundle.stamps);
    },
  );
}

export async function putProject(project: Project): Promise<void> {
  await db.projects.put(project);
}

/** Removes the project row and every record scoped to it. */
export async function deleteProjectDeep(projectId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.projects, ...PROJECT_TABLES.map((name) => db[name])],
    async () => {
      await Promise.all(
        PROJECT_TABLES.map((name) => db[name].where('projectId').equals(projectId).delete()),
      );
      await db.projects.delete(projectId);
    },
  );
}

/** Empties a project's contents while keeping the project itself. */
export async function clearProjectContents(projectId: string): Promise<void> {
  await db.transaction('rw', PROJECT_TABLES.map((name) => db[name]), async () => {
    await Promise.all(
      PROJECT_TABLES.map((name) => db[name].where('projectId').equals(projectId).delete()),
    );
  });
}

export async function loadSettings(): Promise<Settings> {
  const row = await db.settings.get('app');
  const parsed = settingsSchema.safeParse(row ?? defaultSettings());
  return parsed.success ? (parsed.data as Settings) : defaultSettings();
}

export async function putSettings(settings: Settings): Promise<void> {
  await db.settings.put(settings);
}
