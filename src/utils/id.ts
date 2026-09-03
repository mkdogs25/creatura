import type { EntityKind } from '@/types/domain';

const PREFIX: Record<EntityKind, string> = {
  note: 'note',
  character: 'character',
  location: 'location',
  creature: 'creature',
  tech: 'tech',
  custom: 'custom',
  folder: 'folder',
  category: 'category',
  tag: 'tag',
  event: 'event',
  pov: 'pov',
  map: 'map',
  marker: 'marker',
  relationship: 'rel',
  section: 'section',
  project: 'project',
  cell: 'cell',
  chapter: 'chapter',
  terrainStroke: 'terrain',
  stamp: 'stamp',
};

const KIND_BY_PREFIX = Object.fromEntries(
  Object.entries(PREFIX).map(([kind, prefix]) => [prefix, kind as EntityKind]),
) as Record<string, EntityKind>;

/** Monotonic-ish suffix so ids sort roughly by creation order when debugging. */
let counter = 0;

function randomPart(): string {
  counter = (counter + 1) % 0xffff;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${time}${counter.toString(36)}${rand}`;
}

/** `newId('character')` → `character_m3k1x9f2p`. */
export function newId(kind: EntityKind): string {
  return `${PREFIX[kind]}_${randomPart()}`;
}

/** Reads the entity kind back out of an id, or null for an unrecognised one. */
export function kindOfId(id: string | null | undefined): EntityKind | null {
  if (!id) return null;
  const prefix = id.split('_')[0];
  return KIND_BY_PREFIX[prefix] ?? null;
}

export function isDocId(id: string | null | undefined): boolean {
  const kind = kindOfId(id);
  return (
    kind === 'note' ||
    kind === 'character' ||
    kind === 'location' ||
    kind === 'creature' ||
    kind === 'tech' ||
    kind === 'custom'
  );
}
