import { db } from '@/db/database';
import type { AnyDoc, DocSnapshot } from '@/types/domain';
import { newId } from '@/utils/id';

/** How many recent states to keep per document. */
export const MAX_SNAPSHOTS = 8;

/** Minimum gap between snapshots, so a long writing session keeps history. */
export const SNAPSHOT_INTERVAL_MS = 2 * 60 * 1000;

export async function listSnapshots(docId: string): Promise<DocSnapshot[]> {
  const rows = await db.snapshots.where('docId').equals(docId).toArray();
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Records the document's current content as a recoverable state, unless a
 * snapshot was already taken recently. Returns true when one was written.
 *
 * Called with the state *before* an edit is applied, so the ring always holds
 * versions the writer can go back to.
 */
export async function maybeSnapshot(doc: AnyDoc): Promise<boolean> {
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
  await db.snapshots.put(snapshot);

  const stale = existing.slice(MAX_SNAPSHOTS - 1);
  if (stale.length > 0) await db.snapshots.bulkDelete(stale.map((row) => row.id));
  return true;
}

export async function deleteSnapshotsFor(docId: string): Promise<void> {
  await db.snapshots.where('docId').equals(docId).delete();
}

export async function deleteSnapshotsForProject(projectId: string): Promise<void> {
  await db.snapshots.where('projectId').equals(projectId).delete();
}
