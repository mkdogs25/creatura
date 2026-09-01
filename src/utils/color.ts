/** Accent palette used for tags, POV lanes, sections and markers. */
export const PALETTE = [
  '#F5B942',
  '#E0736D',
  '#6FA8A0',
  '#8C7BC4',
  '#D08A52',
  '#5E8FB5',
  '#B4936C',
  '#9AAE6B',
  '#C97EA8',
  '#7C8AA3',
] as const;

/** Deterministic colour for a given key, so a tag keeps its colour on reload. */
export function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/** Returns the colour with an alpha channel, for tinted backgrounds. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Picks black or white text for a coloured chip, by perceived luminance. */
export function readableTextOn(hex: string): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  if ([r, g, b].some(Number.isNaN)) return '#111';
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? '#1B1D22' : '#F7F4EF';
}
