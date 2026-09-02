import type { TerrainKind } from '@/types/domain';

export interface TerrainTypeDef {
  id: TerrainKind;
  label: string;
  /** Base stroke color the brush paints with — see `MapTerrainStroke.terrain`. */
  color: string;
}

/** The brush palette in the map builder, in the order they're offered. */
export const TERRAIN_TYPES: TerrainTypeDef[] = [
  { id: 'grass', label: 'Grass', color: '#8FB86D' },
  { id: 'forest', label: 'Forest', color: '#3E6B37' },
  { id: 'water', label: 'Water', color: '#5B8FB0' },
  { id: 'mountain', label: 'Mountain', color: '#8B8378' },
  { id: 'hills', label: 'Hills', color: '#A9A374' },
  { id: 'sand', label: 'Sand', color: '#D9C482' },
  { id: 'snow', label: 'Snow', color: '#E5EAEC' },
  { id: 'swamp', label: 'Swamp', color: '#6B7A4F' },
];

const BY_ID = new Map(TERRAIN_TYPES.map((t) => [t.id, t]));

export function terrainColor(kind: TerrainKind): string {
  return BY_ID.get(kind)?.color ?? '#8FB86D';
}

export function terrainLabel(kind: TerrainKind): string {
  return BY_ID.get(kind)?.label ?? kind;
}
