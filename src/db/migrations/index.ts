import type Dexie from 'dexie';

/**
 * Schema history for the local database.
 *
 * Each entry is additive: Dexie upgrades an existing database in place, so a
 * reader who has been using Creatura since v1 keeps their work when a later
 * version adds a table. Never renumber or edit a published version — add a
 * new one below it.
 */
export function applyMigrations(db: Dexie): void {
  // v1 — the original schema.
  db.version(1).stores({
    projects: 'id, name, archived, lastOpenedAt',
    folders: 'id, projectId, parentId, order',
    characters: 'id, projectId, folderId, name, order',
    locations: 'id, projectId, folderId, name, order',
    notes: 'id, projectId, folderId, name, order',
    tags: 'id, projectId, name',
    relationships: 'id, projectId, fromId, toId',
    events: 'id, projectId, start, povId',
    sections: 'id, projectId, kind, start',
    povs: 'id, projectId, order',
    maps: 'id, projectId',
    markers: 'id, projectId, mapId, locationId',
    cells: 'id, projectId, characterId, locationId, [characterId+locationId]',
    settings: 'id',
  });

  // v2 — adds per-document snapshots for lightweight recovery.
  db.version(2).stores({
    snapshots: 'id, docId, projectId, createdAt, [docId+createdAt]',
  });

  // v3 — adds manuscript chapters, the project's actual draft text.
  db.version(3).stores({
    chapters: 'id, projectId, order',
  });

  // v4 — a single local-only row for the on-disk backup folder handle and
  // its status. Never part of a project export or the folder backup itself.
  db.version(4).stores({
    device: 'id',
  });

  // v5 — painted terrain strokes and decorative stamps on maps.
  db.version(5).stores({
    terrain: 'id, projectId, mapId, order',
    stamps: 'id, projectId, mapId, order',
  });
}
