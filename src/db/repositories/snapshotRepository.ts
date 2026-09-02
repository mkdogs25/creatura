import { supabase } from '@/lib/supabaseClient';
import { toRow, fromRows } from '@/lib/caseMapping';
import type { DocSnapshot, RichContent } from '@/types/domain';
import { newId } from '@/utils/id';

/** The minimal shape a snapshot needs — satisfied by any doc kind or a chapter. */
interface Snapshottable {
  id: string;
  projectId: string;
  content: RichContent;
  wordCount: number;
}

/** How many recent states to keep per document. */
export const MAX_SNAPSHOTS = 8;

/** Minimum gap between snapshots, so a long writing session keeps history. */
export const SNAPSHOT_INTERVAL_MS = 2 * 60 * 1000;

export async function listSnapshots(docId: string): Promise<DocSnapshot[]> {
  const { data, error } = await supabase
    .from('snapshots')
    .select('*')
    .eq('doc_id', docId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return fromRows<DocSnapshot>(data ?? []);
}

/**
 * Records the document's current content as a recoverable state, unless a
 * snapshot was already taken recently. Returns true when one was written.
 *
 * Called with the state *before* an edit is applied, so the ring always holds
 * versions the writer can go back to.
 */
export async function maybeSnapshot(doc: Snapshottable): Promise<boolean> {
  const existing = await listSnapshots(doc.id);
  const newest = existing[0];
  if (newest && Date.now() - newest.createdAt < SNAPSHOT_INTERVAL_MS) return false;

  const snapshot: DocSnapshot = {
    id: newId('tag'),
    docId: doc.id,
    projectId: doc.projectId,
    content: doc.content,
    wordCount: doc.wordCount,
    createdAt: Date.now(),
  };
  const { error: putError } = await supabase.from('snapshots').upsert(toRow(snapshot));
  if (putError) throw putError;

  const stale = existing.slice(MAX_SNAPSHOTS - 1);
  if (stale.length > 0) {
    const { error: deleteError } = await supabase
      .from('snapshots')
      .delete()
      .in('id', stale.map((row) => row.id));
    if (deleteError) throw deleteError;
  }
  return true;
}

export async function deleteSnapshotsFor(docId: string): Promise<void> {
  const { error } = await supabase.from('snapshots').delete().eq('doc_id', docId);
  if (error) throw error;
}

export async function deleteSnapshotsForProject(projectId: string): Promise<void> {
  const { error } = await supabase.from('snapshots').delete().eq('project_id', projectId);
  if (error) throw error;
}
