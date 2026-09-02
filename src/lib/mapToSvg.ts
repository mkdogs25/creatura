import type { MapMarker, StoryMap } from '@/types/domain';

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

/**
 * Renders a map as a standalone SVG file — readable in any browser or image
 * viewer, not just this app. Colors are literal hex, not CSS variables,
 * since a file on disk has no theme to inherit. The marker/map data is also
 * embedded as JSON in a `<metadata>` element: invisible to a viewer, but
 * enough that a future importer could read a backed-up map back losslessly
 * instead of just looking at it.
 */
export function mapToSvg(
  map: StoryMap,
  markers: MapMarker[],
  labelFor: (marker: MapMarker) => string,
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

  const metadata = JSON.stringify({ map, markers });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>${escapeXml(map.name)}</title>
  <metadata>${escapeXml(metadata)}</metadata>
  <rect width="${width}" height="${height}" fill="${BACKGROUND_FILL[map.background]}" stroke="#00000033" stroke-width="1" />
  ${backgroundImage}
  ${gridPattern}
  ${markerGlyphs}
</svg>
`;
}
