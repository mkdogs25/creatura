import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ImageIcon,
  Link2,
  Link2Off,
  Maximize2,
  MapPin,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { useNavigation } from '@/hooks/useNavigation';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Tooltip } from '@/components/ui/Tooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { pickImageAsDataUrl } from '@/utils/download';
import { clamp } from '@/utils/time';
import type { MapMarker } from '@/types/domain';

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

/**
 * The map workspace.
 *
 * Markers are records that point at canonical Location documents, so opening
 * one lands in the same entry the library and timeline use — the map is a
 * second view of the world, not a second copy of it.
 */
export function MapBuilder({ mapId: requestedMapId }: { mapId?: string | null }) {
  const bundle = useProjectStore((s) => s.bundle);
  const createMap = useProjectStore((s) => s.createMap);
  const updateMap = useProjectStore((s) => s.updateMap);
  const createMarker = useProjectStore((s) => s.createMarker);
  const updateMarker = useProjectStore((s) => s.updateMarker);
  const deleteMarker = useProjectStore((s) => s.deleteMarker);
  const confirm = useUiStore((s) => s.confirm);
  const { openEntity } = useNavigation();

  const maps = bundle?.maps ?? [];
  const [selectedMapId, setSelectedMapId] = useState<string | null>(
    requestedMapId ?? maps[0]?.id ?? null,
  );
  const map = maps.find((m) => m.id === selectedMapId) ?? maps[0] ?? null;

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 0.7 });
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const panState = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const dragState = useRef<{ pointerId: number; markerId: string } | null>(null);

  const markers = useMemo(
    () => (map ? (bundle?.markers ?? []).filter((marker) => marker.mapId === map.id) : []),
    [bundle?.markers, map],
  );

  useEffect(() => {
    if (requestedMapId) setSelectedMapId(requestedMapId);
  }, [requestedMapId]);

  /** Converts a pointer event to map-space coordinates. */
  const toMapSpace = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - viewport.x) / viewport.scale,
        y: (clientY - rect.top - viewport.y) / viewport.scale,
      };
    },
    [viewport],
  );

  const zoomBy = useCallback((factor: number, originX?: number, originY?: number) => {
    setViewport((current) => {
      const scale = clamp(current.scale * factor, 0.15, 4);
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { ...current, scale };
      const cx = originX ?? rect.width / 2;
      const cy = originY ?? rect.height / 2;
      // Keep the point under the cursor fixed while zooming.
      const ratio = scale / current.scale;
      return {
        scale,
        x: cx - (cx - current.x) * ratio,
        y: cy - (cy - current.y) * ratio,
      };
    });
  }, []);

  const fitToView = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !map) return;
    const scale = Math.min(rect.width / map.width, rect.height / map.height) * 0.9;
    setViewport({
      scale,
      x: (rect.width - map.width * scale) / 2,
      y: (rect.height - map.height * scale) / 2,
    });
  }, [map]);

  useEffect(() => {
    // Fit once a map is available and the SVG has laid out.
    const frame = requestAnimationFrame(fitToView);
    return () => cancelAnimationFrame(frame);
  }, [fitToView, map?.id]);

  if (!bundle) return null;

  if (!map) {
    return (
      <EmptyState
        icon={MapPin}
        title="No map yet."
        body="Draw the shape of your world. Markers you place link straight to the locations already in your library."
      >
        <Button
          variant="primary"
          onClick={() => setSelectedMapId(createMap({ name: 'New map' }))}
        >
          <Plus size={14} />
          Create a map
        </Button>
      </EmptyState>
    );
  }

  const activeMarker = markers.find((marker) => marker.id === activeMarkerId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] px-3 py-2">
        <Select
          value={map.id}
          aria-label="Select map"
          onChange={(event) => setSelectedMapId(event.target.value)}
          className="w-40 text-[0.78rem]"
        >
          {maps.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>

        <Button
          variant={placing ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setPlacing((value) => !value)}
          aria-pressed={placing}
        >
          <MapPin size={13} />
          {placing ? 'Click the map…' : 'Add marker'}
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Tooltip label="Zoom out">
            <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
              <Minus size={14} />
            </Button>
          </Tooltip>
          <span className="w-11 text-center font-mono text-[0.7rem] text-[var(--color-ink-faint)] tabular-nums">
            {Math.round(viewport.scale * 100)}%
          </span>
          <Tooltip label="Zoom in">
            <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
              <Plus size={14} />
            </Button>
          </Tooltip>
          <Tooltip label="Fit to view">
            <Button variant="ghost" size="icon-sm" aria-label="Fit map to view" onClick={fitToView}>
              <Maximize2 size={13} />
            </Button>
          </Tooltip>
          <Tooltip label="Set a background image">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Set background image"
              onClick={async () => {
                const data = await pickImageAsDataUrl();
                if (data) updateMap(map.id, { background: 'image', imageData: data });
              }}
            >
              <ImageIcon size={13} />
            </Button>
          </Tooltip>
          <Button variant="ghost" size="sm" onClick={() => setSelectedMapId(createMap({}))}>
            <Plus size={13} />
            New map
          </Button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <svg
          ref={svgRef}
          role="application"
          aria-label={`${map.name} — pan with drag, zoom with the scroll wheel`}
          className={`h-full w-full touch-none ${placing ? 'cursor-crosshair' : 'cursor-grab'}`}
          onWheel={(event) => {
            const rect = svgRef.current?.getBoundingClientRect();
            zoomBy(
              event.deltaY < 0 ? 1.1 : 1 / 1.1,
              rect ? event.clientX - rect.left : undefined,
              rect ? event.clientY - rect.top : undefined,
            );
          }}
          onPointerDown={(event) => {
            if (placing) {
              const point = toMapSpace(event.clientX, event.clientY);
              const id = createMarker({ mapId: map.id, x: point.x, y: point.y, label: 'New marker' });
              setActiveMarkerId(id);
              setPlacing(false);
              return;
            }
            if (dragState.current) return;
            panState.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: viewport.x,
              originY: viewport.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = dragState.current;
            if (drag && drag.pointerId === event.pointerId) {
              const point = toMapSpace(event.clientX, event.clientY);
              updateMarker(drag.markerId, {
                x: clamp(point.x, 0, map.width),
                y: clamp(point.y, 0, map.height),
              });
              return;
            }
            const pan = panState.current;
            if (!pan || pan.pointerId !== event.pointerId) return;
            setViewport((current) => ({
              ...current,
              x: pan.originX + (event.clientX - pan.startX),
              y: pan.originY + (event.clientY - pan.startY),
            }));
          }}
          onPointerUp={(event) => {
            panState.current = null;
            dragState.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            panState.current = null;
            dragState.current = null;
          }}
        >
          <defs>
            <pattern id="creatura-map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="var(--color-line)"
                strokeWidth="1"
                opacity="0.5"
              />
            </pattern>
            <radialGradient id="creatura-map-vignette" cx="50%" cy="45%" r="72%">
              <stop offset="0%" stopColor="var(--color-surface)" />
              <stop offset="100%" stopColor="var(--color-surface-sunken)" />
            </radialGradient>
          </defs>

          <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
            <rect
              width={map.width}
              height={map.height}
              fill={
                map.background === 'void'
                  ? 'var(--color-surface-sunken)'
                  : 'url(#creatura-map-vignette)'
              }
              stroke="var(--color-line-strong)"
              strokeWidth={1 / viewport.scale}
            />
            {map.background === 'image' && map.imageData && (
              <image
                href={map.imageData}
                width={map.width}
                height={map.height}
                preserveAspectRatio="xMidYMid slice"
              />
            )}
            {map.background === 'grid' && (
              <rect width={map.width} height={map.height} fill="url(#creatura-map-grid)" />
            )}

            {markers.map((marker) => (
              <MarkerGlyph
                key={marker.id}
                marker={marker}
                scale={viewport.scale}
                active={marker.id === activeMarkerId}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  dragState.current = { pointerId: event.pointerId, markerId: marker.id };
                  setActiveMarkerId(marker.id);
                  (event.currentTarget.ownerSVGElement as SVGSVGElement)?.setPointerCapture(
                    event.pointerId,
                  );
                }}
              />
            ))}
          </g>
        </svg>

        {activeMarker && (
          <MarkerInspector
            marker={activeMarker}
            onClose={() => setActiveMarkerId(null)}
            onOpenLocation={openEntity}
            onDelete={async () => {
              const ok = await confirm({
                title: `Remove “${activeMarker.label}”?`,
                body: 'The linked location itself is not deleted.',
                confirmLabel: 'Remove marker',
                destructive: true,
              });
              if (ok) {
                deleteMarker(activeMarker.id);
                setActiveMarkerId(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function MarkerGlyph({
  marker,
  scale,
  active,
  onPointerDown,
}: {
  marker: MapMarker;
  scale: number;
  active: boolean;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  // Counter-scale so markers stay a constant size on screen as you zoom.
  const inverse = 1 / scale;
  return (
    <g
      transform={`translate(${marker.x} ${marker.y}) scale(${inverse})`}
      className="cursor-pointer"
      onPointerDown={onPointerDown}
      role="button"
      aria-label={marker.label}
      tabIndex={0}
    >
      <circle
        r={active ? 9 : 6}
        fill={marker.color}
        stroke="var(--color-canvas)"
        strokeWidth={2}
      />
      {active && (
        <circle r={14} fill="none" stroke={marker.color} strokeWidth={1} opacity={0.55} />
      )}
      <text
        x={13}
        y={4}
        fontSize={12}
        fontFamily="var(--font-sans)"
        fill="var(--color-ink)"
        stroke="var(--color-canvas)"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {marker.label}
      </text>
    </g>
  );
}

function MarkerInspector({
  marker,
  onClose,
  onDelete,
  onOpenLocation,
}: {
  marker: MapMarker;
  onClose: () => void;
  onDelete: () => void;
  onOpenLocation: (id: string) => void;
}) {
  const locations = useProjectStore((s) => s.bundle?.locations ?? []);
  const updateMarker = useProjectStore((s) => s.updateMarker);
  const linked = locations.find((location) => location.id === marker.locationId) ?? null;

  return (
    <div className="absolute right-3 bottom-3 w-64 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] p-3 shadow-[var(--shadow-float)] animate-rise">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="type-label">Marker</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close marker details"
          className="text-[0.7rem] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
        >
          Done
        </button>
      </div>

      <Input
        value={marker.label}
        aria-label="Marker label"
        onChange={(event) => updateMarker(marker.id, { label: event.target.value })}
        className="mb-2 text-[0.78rem]"
      />

      <Select
        value={marker.locationId ?? ''}
        aria-label="Linked location"
        onChange={(event) => {
          const locationId = event.target.value || null;
          const location = locations.find((item) => item.id === locationId);
          updateMarker(marker.id, {
            locationId,
            // Adopt the location's name unless the author renamed the marker.
            label: location && marker.label === 'New marker' ? location.name : marker.label,
          });
        }}
        className="mb-2 text-[0.78rem]"
      >
        <option value="">Not linked to a location</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </Select>

      <div className="flex items-center gap-1.5">
        {linked ? (
          <Button variant="secondary" size="sm" onClick={() => onOpenLocation(linked.id)}>
            <Link2 size={12} />
            Open entry
          </Button>
        ) : (
          <span className="flex items-center gap-1 text-[0.72rem] text-[var(--color-ink-faint)]">
            <Link2Off size={11} aria-hidden="true" />
            Unlinked
          </span>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="Delete marker" onClick={onDelete} className="ml-auto">
          <Trash2 size={13} className="text-[var(--color-danger)]" />
        </Button>
      </div>
    </div>
  );
}
