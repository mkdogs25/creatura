/**
 * The stamp icon set for the map builder — simple, original line-art
 * shapes (not licensed art), each on a 24×24 viewBox and colored via
 * `currentColor` so a stamp's own `color` field tints the whole icon.
 */
export type MapIconShape =
  | { tag: 'path'; d: string; strokeOnly?: boolean; strokeWidth?: number; fillOpacity?: number }
  | { tag: 'circle'; cx: number; cy: number; r: number; fillOpacity?: number }
  | { tag: 'rect'; x: number; y: number; width: number; height: number; rx?: number; fillOpacity?: number }
  | { tag: 'polygon'; points: string; fillOpacity?: number }
  | { tag: 'line'; x1: number; y1: number; x2: number; y2: number; strokeWidth?: number };

export type MapIconCategory = 'Nature' | 'Structures' | 'Travel' | 'Camp';

export interface MapIconDef {
  id: string;
  label: string;
  category: MapIconCategory;
  shapes: MapIconShape[];
}

export const MAP_ICONS: MapIconDef[] = [
  {
    id: 'tree',
    label: 'Tree',
    category: 'Nature',
    shapes: [
      { tag: 'rect', x: 10.5, y: 15, width: 3, height: 7 },
      { tag: 'circle', cx: 12, cy: 9, r: 7.5 },
    ],
  },
  {
    id: 'pine',
    label: 'Pine',
    category: 'Nature',
    shapes: [
      { tag: 'rect', x: 11, y: 19, width: 2, height: 3 },
      { tag: 'polygon', points: '12,8 5,18 19,18', fillOpacity: 0.92 },
      { tag: 'polygon', points: '12,2 6,13 18,13' },
    ],
  },
  {
    id: 'mountain',
    label: 'Mountain',
    category: 'Nature',
    shapes: [
      { tag: 'polygon', points: '10,20 16,9 22,20', fillOpacity: 0.85 },
      { tag: 'polygon', points: '2,20 9,5 16,20' },
    ],
  },
  {
    id: 'hill',
    label: 'Hill',
    category: 'Nature',
    shapes: [{ tag: 'path', d: 'M2,19 Q12,5 22,19 L22,20 L2,20 Z' }],
  },
  {
    id: 'rock',
    label: 'Rock',
    category: 'Nature',
    shapes: [{ tag: 'polygon', points: '4,20 3,14 7,9 13,7 18,10 20,15 18,20' }],
  },
  {
    id: 'water',
    label: 'Water',
    category: 'Nature',
    shapes: [
      { tag: 'path', d: 'M1,8 C4,5 8,5 11,8 C14,11 18,11 21,8', strokeOnly: true, strokeWidth: 2 },
      { tag: 'path', d: 'M1,14 C4,11 8,11 11,14 C14,17 18,17 21,14', strokeOnly: true, strokeWidth: 2 },
      { tag: 'path', d: 'M1,20 C4,17 8,17 11,20 C14,23 18,23 21,20', strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    id: 'house',
    label: 'House',
    category: 'Structures',
    shapes: [
      { tag: 'rect', x: 5, y: 12, width: 14, height: 9 },
      { tag: 'polygon', points: '3,12 12,4 21,12' },
    ],
  },
  {
    id: 'tower',
    label: 'Tower',
    category: 'Structures',
    shapes: [
      { tag: 'rect', x: 7, y: 8, width: 10, height: 14 },
      { tag: 'rect', x: 6, y: 4, width: 3, height: 4 },
      { tag: 'rect', x: 10.5, y: 4, width: 3, height: 4 },
      { tag: 'rect', x: 15, y: 4, width: 3, height: 4 },
    ],
  },
  {
    id: 'ruins',
    label: 'Ruins',
    category: 'Structures',
    shapes: [
      { tag: 'rect', x: 4, y: 10, width: 3, height: 11 },
      { tag: 'rect', x: 10.5, y: 14, width: 3, height: 7 },
      { tag: 'rect', x: 17, y: 8, width: 3, height: 13 },
    ],
  },
  {
    id: 'cave',
    label: 'Cave',
    category: 'Structures',
    shapes: [{ tag: 'path', d: 'M2,21 L2,14 Q12,2 22,14 L22,21 Z' }],
  },
  {
    id: 'bridge',
    label: 'Bridge',
    category: 'Structures',
    shapes: [
      { tag: 'path', d: 'M2,17 Q12,6 22,17', strokeOnly: true, strokeWidth: 2.5 },
      { tag: 'line', x1: 2, y1: 17, x2: 22, y2: 17, strokeWidth: 2.5 },
      { tag: 'line', x1: 7, y1: 17, x2: 7, y2: 21, strokeWidth: 2 },
      { tag: 'line', x1: 17, y1: 17, x2: 17, y2: 21, strokeWidth: 2 },
    ],
  },
  {
    id: 'ship',
    label: 'Ship',
    category: 'Travel',
    shapes: [
      { tag: 'polygon', points: '3,17 21,17 18,21 6,21' },
      { tag: 'line', x1: 12, y1: 17, x2: 12, y2: 4, strokeWidth: 1.5 },
      { tag: 'polygon', points: '12,5 12,16 19,16', fillOpacity: 0.9 },
    ],
  },
  {
    id: 'signpost',
    label: 'Signpost',
    category: 'Travel',
    shapes: [
      { tag: 'rect', x: 11, y: 6, width: 2, height: 15 },
      { tag: 'rect', x: 6, y: 6, width: 9, height: 5, rx: 1 },
    ],
  },
  {
    id: 'campfire',
    label: 'Campfire',
    category: 'Camp',
    shapes: [
      {
        tag: 'path',
        d: 'M12,3 C9,8 7,10 7,13 a5,5 0 1 0 10,0 C17,10 15,8 12,3 Z',
      },
      { tag: 'line', x1: 4, y1: 20, x2: 20, y2: 17, strokeWidth: 1.5 },
      { tag: 'line', x1: 4, y1: 17, x2: 20, y2: 20, strokeWidth: 1.5 },
    ],
  },
];

const BY_ID = new Map(MAP_ICONS.map((icon) => [icon.id, icon]));

export function mapIconById(id: string): MapIconDef | undefined {
  return BY_ID.get(id);
}
