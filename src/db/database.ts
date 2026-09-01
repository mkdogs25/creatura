import Dexie, { type Table } from 'dexie';
import { applyMigrations } from '@/db/migrations';
import type {
  CharacterDoc,
  DocSnapshot,
  Folder,
  LocationDoc,
  MapMarker,
  MatrixCell,
  NoteDoc,
  PointOfView,
  Project,
  Relationship,
  Settings,
  StoryMap,
  TimelineEvent,
  TimelineSection,
} from '@/types/domain';

/**
 * The single IndexedDB database backing Creatura.
 *
 * Characters, locations and notes live in separate tables rather than one
 * polymorphic table: it keeps their indexes tight, and it is what makes the
 * `character_…` / `location_…` id prefixes meaningful rather than decorative.
 */
export class CreaturaDatabase extends Dexie {
  projects!: Table<Project, string>;
  folders!: Table<Folder, string>;
  characters!: Table<CharacterDoc, string>;
  locations!: Table<LocationDoc, string>;
  notes!: Table<NoteDoc, string>;
  tags!: Table<import('@/types/domain').Tag, string>;
  relationships!: Table<Relationship, string>;
  events!: Table<TimelineEvent, string>;
  sections!: Table<TimelineSection, string>;
  povs!: Table<PointOfView, string>;
  maps!: Table<StoryMap, string>;
  markers!: Table<MapMarker, string>;
  cells!: Table<MatrixCell, string>;
  settings!: Table<Settings, string>;
  snapshots!: Table<DocSnapshot, string>;

  constructor() {
    super('creatura');

    applyMigrations(this);
  }
}

export const db = new CreaturaDatabase();

/** Names of every project-scoped table, used for bulk delete and export. */
export const PROJECT_TABLES = [
  'folders',
  'characters',
  'locations',
  'notes',
  'tags',
  'relationships',
  'events',
  'sections',
  'povs',
  'maps',
  'markers',
  'cells',
] as const;

export type ProjectTableName = (typeof PROJECT_TABLES)[number];

let openPromise: Promise<void> | null = null;

/**
 * Opens the database, recovering from the two failure modes that otherwise
 * leave the app permanently blank: a schema left behind by a newer build, and
 * a browser that refuses IndexedDB outright (private mode, blocked storage).
 */
export async function openDatabase(): Promise<{ ok: boolean; reason?: string }> {
  if (!openPromise) {
    openPromise = db.open().then(() => undefined);
  }
  try {
    await openPromise;
    return { ok: true };
  } catch (error) {
    openPromise = null;
    const name = error instanceof Error ? error.name : '';
    if (name === 'VersionError') {
      return {
        ok: false,
        reason:
          'This browser holds a Creatura database from a newer version. Export your work there, or clear site data to continue.',
      };
    }
    return {
      ok: false,
      reason:
        'Local storage is unavailable in this browser context, so changes cannot be saved. Writing still works, but nothing will persist.',
    };
  }
}

/** Best-effort storage estimate for the Data & Storage settings panel. */
export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
