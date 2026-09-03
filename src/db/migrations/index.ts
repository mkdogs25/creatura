import type Dexie from 'dexie';
import { builtinCategories, type RichContent } from '@/types/domain';
import { docToPlainText } from '@/utils/text';

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

  // v6 — creatures and tech/artifacts as first-class document kinds,
  // alongside characters and locations.
  db.version(6).stores({
    creatures: 'id, projectId, folderId, name, order',
    tech: 'id, projectId, folderId, name, order',
  });

  // v7 — document categories become user-editable data instead of fixed
  // TypeScript shapes: every project gets the four built-in categories'
  // current field lists as real rows it can add to, edit or delete fields
  // from, and can define any number of its own on top (stored in the new
  // `customDocs` table, one per category). Locations, creatures and tech
  // stop having a prose editor in the same change the built-in Location
  // profile just got — so their existing body text is copied into a new
  // "Notes" profile field first. Nothing is deleted; `content` stays on
  // the record, just unused going forward.
  db.version(7)
    .stores({
      categories: 'id, projectId, order',
      customDocs: 'id, projectId, folderId, categoryId, name, order',
    })
    .upgrade(async (tx) => {
      const now = Date.now();
      const projects = await tx.table('projects').toArray();
      for (const project of projects as Array<{ id: string }>) {
        await tx.table('categories').bulkPut(builtinCategories(project.id, now));
      }

      for (const tableName of ['locations', 'creatures', 'tech']) {
        await tx
          .table(tableName)
          .toCollection()
          .modify((row: { content?: RichContent; profile?: Record<string, string> }) => {
            const text = docToPlainText(row.content);
            if (!text) return;
            row.profile = { ...(row.profile ?? {}), notes: text };
          });
      }
    });

  // v8 — fixes a data bug from v7: the four built-in categories were given
  // bare ids ('character', 'location', 'creature', 'tech'), but every
  // project in this database shares one `categories` table keyed by `id`.
  // Any second project — including the demo project, one tap away from
  // onboarding — silently stole the first project's rows on save, leaving
  // it with no built-in categories at all: profile forms stopped rendering
  // and the sidebar fell back to the plain note icon ("characters became
  // notes"). Built-in ids are now namespaced per project
  // (`${projectId}:${kind}`, see `builtinCategories`), so this deletes the
  // old collision-prone rows and re-seeds every project's four built-ins
  // fresh. Any edit made to a built-in category's fields before this fix
  // can't be recovered — the shared, overwritten row makes it impossible to
  // tell which project's edit was the real one — but no document or its
  // data is touched here.
  db.version(8).upgrade(async (tx) => {
    const now = Date.now();
    await tx.table('categories').bulkDelete(['character', 'location', 'creature', 'tech']);
    const projects = await tx.table('projects').toArray();
    for (const project of projects as Array<{ id: string }>) {
      await tx.table('categories').bulkPut(builtinCategories(project.id, now));
    }
  });
}
