import type { Table } from 'dexie';
import { db, type CreaturaDatabase, type ProjectTableName } from '@/db/database';

/**
 * Thin write helpers for the project-scoped collections (tags, events,
 * markers…). Reads go through `loadProjectBundle`; these exist so the store can
 * write one record without knowing anything about Dexie.
 *
 * The row type is derived from the table name, so passing a `Tag` to the
 * `events` table is a compile error rather than a corrupt record.
 */
type RowOf<T extends ProjectTableName> =
  CreaturaDatabase[T] extends Table<infer R, string> ? R : never;

export async function putRecord<T extends ProjectTableName>(
  table: T,
  record: RowOf<T>,
): Promise<void> {
  await (db[table] as Table<RowOf<T>, string>).put(record);
}

export async function putRecords<T extends ProjectTableName>(
  table: T,
  records: Array<RowOf<T>>,
): Promise<void> {
  if (records.length === 0) return;
  await (db[table] as Table<RowOf<T>, string>).bulkPut(records);
}

export async function deleteRecord(table: ProjectTableName, id: string): Promise<void> {
  await db[table].delete(id);
}

export async function deleteRecords(table: ProjectTableName, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db[table].bulkDelete(ids);
}
