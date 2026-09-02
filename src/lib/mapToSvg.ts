import type { MapMarker, MapStamp, MapTerrainStroke, StoryMap } from '@/types/domain';
import { terrainColor } from '@/data/terrainTypes';
import { mapIconById, type MapIconShape } from '@/data/mapIcons';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const BACKGROUND_FILL: Record<StoryMap['background'], string> = {
  parchment: '#EDE3CF',
  void: '#1A1B20',
  grid: '#F4F1E8',
  image: '#EDE3CF',
};

function pathFromPoints(points: Array<{ x: number; y: number }>): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

/** Renders one stamp icon's shapes as a raw SVG string, tinted by `color`. */
function shapesToSvg(shapes: MapIconShape[], color: string): string {
  return shapes
    .map((shape) => {
      if (shape.tag === 'path') {
        return shape.strokeOnly
          ? `<path d="${shape.d}" fill="none" stroke="${escapeXml(color)}" stroke-width="${shape.strokeWidth ?? 2}" stroke-linecap="round" />`
          : `<path d="${shape.d}" fill="${escapeXml(color)}" fill-opacity="${shape.fillOpacity ?? 1}" />`;
      }
      if (shape.tag === 'circle') {
        return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${escapeXml(color)}" fill-opacity="${shape.fillOpacity ?? 1}" />`;
      }
      if (shape.tag === 'rect') {
        return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.rx ?? 0}" fill="${escapeXml(color)}" fill-opacity="${shape.fillOpacity ?? 1}" />`;
      }
      if (shape.tag === 'polygon') {
        return `<polygon points="${shape.points}" fill="${escapeXml(color)}" fill-opacity="${shape.fillOpacity ?? 1}" />`;
      }
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${escapeXml(color)}" stroke-width="${shape.strokeWidth ?? 2}" stroke-linecap="round" />`;
    })
    .join('');
}

/**
 * Renders a map as a standalone SVG file — readable in any browser or image
 * viewer, not just this app. Colors are literal hex, not CSS variables,
 * since a file on disk has no theme to inherit. The map/terrain/stamp/marker
 * data is also embedded as JSON in a `<metadata>` element: invisible to a
 * viewer, but enough that a future importer could read a backed-up map back
 * losslessly instead of just looking at it.
 *
 * Layer order matches the live map builder: terrain paints first, stamps
 * sit on top of it, markers stay on top of everything.
 */
export function mapToSvg(
  map: StoryMap,
  markers: MapMarker[],
  labelFor: (marker: MapMarker) => string,
  terrain: MapTerrainStroke[] = [],
  stamps: MapStamp[] = [],
): string {
  const width = Math.round(map.width);
  const height = Math.round(map.height);

  const backgroundImage =
    map.background === 'image' && map.imageData
      ? `<image href="${escapeXml(map.imageData)}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />`
      : '';

  const gridPattern =
    map.background === 'grid'
      ? `<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00000022" stroke-width="1" /></pattern></defs><rect width="${width}" height="${height}" fill="url(#grid)" />`
      : '';

  const terrainStrokes = [...terrain]
    .sort((a, b) => a.order - b.order)
    .map(
      (stroke) =>
        `<path d="${pathFromPoints(stroke.points)}" fill="none" stroke="${escapeXml(terrainColor(stroke.terrain))}" stroke-opacity="0.55" stroke-width="${stroke.brushSize}" stroke-linecap="round" stroke-linejoin="round" />`,
    )
    .join('\n    ');

  const stampGlyphs = [...stamps]
    .sort((a, b) => a.order - b.order)
    .map((stamp) => {
      const icon = mapIconById(stamp.icon);
      if (!icon) return '';
      const box = (28 * stamp.scale) / 24;
      return `<g transform="translate(${stamp.x} ${stamp.y}) rotate(${stamp.rotation}) scale(${box}) translate(-12 -12)">${shapesToSvg(icon.shapes, stamp.color)}</g>`;
    })
    .join('\n    ');

  const markerGlyphs = markers
    .map((marker) => {
      const label = escapeXml(labelFor(marker));
      const x = Math.round(marker.x);
      const y = Math.round(marker.y);
      return `<g transform="translate(${x} ${y})">
      <circle r="7" fill="${escapeXml(marker.color)}" stroke="#ffffff" stroke-width="1.5" />
      <text x="10" y="4" font-family="sans-serif" font-size="13" fill="#2a2a2a" stroke="#ffffff" stroke-width="3" paint-order="stroke">${label}</text>
      <text x="10" y="4" font-family="sans-serif" font-size="13" fill="#2a2a2a">${label}</text>
    </g>`;
    })
    .join('\n    ');

  const metadata = JSON.stringify({ map, markers, terrain, stamps });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>${escapeXml(map.name)}</title>
  <metadata>${escapeXml(metadata)}</metadata>
  <rect width="${width}" height="${height}" fill="${BACKGROUND_FILL[map.background]}" stroke="#00000033" stroke-width="1" />
  ${backgroundImage}
  ${gridPattern}
  ${terrainStrokes}
  ${stampGlyphs}
  ${markerGlyphs}
</svg>
`;
}
