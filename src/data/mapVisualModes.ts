import type { MapTerrainStroke, TerrainKind } from '@/types/domain';

export type MapVisualMode = 'natural' | 'cyberpunk' | 'pastel' | 'monochrome' | 'hueShift';

export interface VisualModeDef {
  id: MapVisualMode;
  label: string;
  description: string;
}

/** The map builder's palette presets, in the order offered. Each is a pure
 * rendering choice — nothing about a stroke's stored data changes, so
 * switching modes is instant and lossless, the same way `tool`/`brushSize`
 * are session-only state rather than something saved per map. */
export const MAP_VISUAL_MODES: VisualModeDef[] = [
  { id: 'natural', label: 'Natural', description: 'The default terrain palette.' },
  { id: 'cyberpunk', label: 'Neon Cyberpunk', description: 'High-contrast neon on black.' },
  { id: 'pastel', label: 'Pastel', description: 'Soft, muted tones.' },
  { id: 'monochrome', label: 'Monochromatic', description: 'One hue, shaded by terrain.' },
  {
    id: 'hueShift',
    label: 'Hue Shift on Collision',
    description: 'Strokes drift in hue where they overlap a different terrain — the more collisions, the further the shift.',
  },
];

type Palette = Record<TerrainKind, string>;

const NATURAL: Palette = {
  grass: '#8FB86D',
  forest: '#3E6B37',
  water: '#5B8FB0',
  mountain: '#8B8378',
  hills: '#A9A374',
  sand: '#D9C482',
  snow: '#E5EAEC',
  swamp: '#6B7A4F',
};

const CYBERPUNK: Palette = {
  grass: '#39FF14',
  forest: '#00FFA3',
  water: '#00E5FF',
  mountain: '#FF00E5',
  hills: '#B026FF',
  sand: '#FFE600',
  snow: '#FFFFFF',
  swamp: '#FF2079',
};

const PASTEL: Palette = {
  grass: '#B8E0C2',
  forest: '#9AC7A6',
  water: '#AFD8E8',
  mountain: '#D8CFC4',
  hills: '#E3D9B8',
  sand: '#F2E4C2',
  snow: '#F7F7F5',
  swamp: '#C5D6B0',
};

const MONOCHROME: Palette = {
  grass: '#8A8A8A',
  forest: '#5C5C5C',
  water: '#B0B0B0',
  mountain: '#3D3D3D',
  hills: '#707070',
  sand: '#C9C9C9',
  snow: '#EDEDED',
  swamp: '#4A4A4A',
};

const PALETTES: Record<Exclude<MapVisualMode, 'hueShift'>, Palette> = {
  natural: NATURAL,
  cyberpunk: CYBERPUNK,
  pastel: PASTEL,
  monochrome: MONOCHROME,
};

/** A terrain kind's base paint color under a visual mode. `hueShift` paints
 * from the natural palette — its look comes from the per-stroke rotation in
 * `collisionHueRotations`, not a different base palette. */
export function terrainColorForMode(kind: TerrainKind, mode: MapVisualMode): string {
  return mode === 'hueShift' ? NATURAL[kind] : PALETTES[mode][kind];
}

/**
 * For "Hue Shift on Collision": how far each stroke's color should rotate,
 * keyed by stroke id. A stroke "collides" with an earlier one (lower
 * `order`) of a *different* terrain kind when any of their points land
 * within both strokes' combined brush radius — a cheap stand-in for actual
 * shape intersection that's accurate enough for a hand-painted map. Each
 * collision adds another 40° of hue rotation, capped at 320° so it never
 * quite wraps back to the original color.
 */
export function collisionHueRotations(strokes: MapTerrainStroke[]): Map<string, number> {
  const ordered = [...strokes].sort((a, b) => a.order - b.order);
  const rotations = new Map<string, number>();

  for (let i = 0; i < ordered.length; i++) {
    const stroke = ordered[i];
    let collisions = 0;
    for (let j = 0; j < i; j++) {
      const other = ordered[j];
      if (other.terrain === stroke.terrain) continue;
      const threshold = (stroke.brushSize + other.brushSize) / 2;
      const thresholdSq = threshold * threshold;
      const collides = stroke.points.some((p) =>
        other.points.some((q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2 <= thresholdSq),
      );
      if (collides) collisions++;
    }
    if (collisions > 0) rotations.set(stroke.id, Math.min(collisions * 40, 320));
  }

  return rotations;
}
