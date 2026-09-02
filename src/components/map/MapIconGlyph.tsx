import type { MapIconShape } from '@/data/mapIcons';

/** Renders one stamp icon's shapes, all tinted by the current `color` prop via `currentColor`. */
export function MapIconGlyph({ shapes }: { shapes: MapIconShape[] }) {
  return (
    <>
      {shapes.map((shape, index) => {
        const key = index;
        if (shape.tag === 'path') {
          return shape.strokeOnly ? (
            <path
              key={key}
              d={shape.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={shape.strokeWidth ?? 2}
              strokeLinecap="round"
            />
          ) : (
            <path key={key} d={shape.d} fill="currentColor" fillOpacity={shape.fillOpacity} />
          );
        }
        if (shape.tag === 'circle') {
          return (
            <circle
              key={key}
              cx={shape.cx}
              cy={shape.cy}
              r={shape.r}
              fill="currentColor"
              fillOpacity={shape.fillOpacity}
            />
          );
        }
        if (shape.tag === 'rect') {
          return (
            <rect
              key={key}
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              rx={shape.rx}
              fill="currentColor"
              fillOpacity={shape.fillOpacity}
            />
          );
        }
        if (shape.tag === 'polygon') {
          return (
            <polygon
              key={key}
              points={shape.points}
              fill="currentColor"
              fillOpacity={shape.fillOpacity}
            />
          );
        }
        return (
          <line
            key={key}
            x1={shape.x1}
            y1={shape.y1}
            x2={shape.x2}
            y2={shape.y2}
            stroke="currentColor"
            strokeWidth={shape.strokeWidth ?? 2}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}
