import { supabase } from '@/lib/supabaseClient';
import { toRow } from '@/lib/caseMapping';
import type { AnyDoc, DocKind } from '@/types/domain';
import { kindOfId } from '@/utils/id';

/** Maps a document kind to the Supabase table that stores it. */
export function tableForKind(kind: DocKind): 'characters' | 'locations' | 'notes' {
  if (kind === 'character') return 'characters';
  if (kind === 'location') return 'locations';
  return 'notes';
}

export async function putDoc(doc: AnyDoc): Promise<void> {
  // `kind` isn't a stored column — which table a row lives in already says
  // what it is — so it's dropped before the row goes to Supabase and added
  // back by the reader (projectRepository's `withKind`) on the way out.
  const { kind, ...rest } = doc;
  const { error } = await supabase.from(tableForKind(kind)).upsert(toRow(rest));
  if (error) throw error;
}

export async function putDocs(docs: AnyDoc[]): Promise<void> {
  await Promise.all(docs.map(putDoc));
}

export async function deleteDoc(docId: string): Promise<void> {
  const kind = kindOfId(docId);
  if (kind !== 'character' && kind !== 'location' && kind !== 'note') return;
  const { error } = await supabase.from(tableForKind(kind)).delete().eq('id', docId);
  if (error) throw error;
}
