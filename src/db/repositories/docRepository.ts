import { db } from '@/db/database';
import type { AnyDoc, DocKind } from '@/types/domain';
import { kindOfId } from '@/utils/id';

/** Maps a document kind to the Dexie table that stores it. */
export function tableForKind(kind: DocKind) {
  if (kind === 'character') return db.characters;
  if (kind === 'location') return db.locations;
  if (kind === 'creature') return db.creatures;
  if (kind === 'tech') return db.tech;
  if (kind === 'custom') return db.customDocs;
  return db.notes;
}

export async function putDoc(doc: AnyDoc): Promise<void> {
  // Each table is typed to its own doc shape; the kind check above is what
  // guarantees the right one is chosen, so the cast is safe here.
  await (tableForKind(doc.kind) as unknown as { put: (d: AnyDoc) => Promise<string> }).put(doc);
}

export async function putDocs(docs: AnyDoc[]): Promise<void> {
  await Promise.all(docs.map(putDoc));
}

export async function deleteDoc(docId: string): Promise<void> {
  const kind = kindOfId(docId);
  if (
    kind !== 'character' &&
    kind !== 'location' &&
    kind !== 'creature' &&
    kind !== 'tech' &&
    kind !== 'custom' &&
    kind !== 'note'
  )
    return;
  await tableForKind(kind).delete(docId);
}
