import { supabase } from '@/lib/supabaseClient';
import { toRow } from '@/lib/caseMapping';
import type { ProjectTableName } from '@/db/database';

/**
 * Thin write helpers for the project-scoped collections (tags, events,
 * markers…). Reads go through `loadProjectBundle`; these exist so the store
 * can write one record without knowing anything about Supabase.
 */
export async function putRecord<T extends { id: string }>(
  table: ProjectTableName,
  record: T,
): Promise<void> {
  const { error } = await supabase.from(table).upsert(toRow(record));
  if (error) throw error;
}

export async function putRecords<T extends { id: string }>(
  table: ProjectTableName,
  records: T[],
): Promise<void> {
  if (records.length === 0) return;
  const { error } = await supabase.from(table).upsert(records.map((record) => toRow(record)));
  if (error) throw error;
}

export async function deleteRecord(table: ProjectTableName, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function deleteRecords(table: ProjectTableName, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from(table).delete().in('id', ids);
  if (error) throw error;
}
