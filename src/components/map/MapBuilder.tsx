import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ImageIcon,
  Link2,
  Link2Off,
  MapPin,
  Maximize,
  Maximize2,
  Minimize,
  Minus,
  MousePointer2,
  Paintbrush,
  Plus,
  Sparkles,
  Trash2,
  Undo2,
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
import { cn } from '@/utils/cn';
import { TERRAIN_TYPES } from '@/data/terrainTypes';
import { MAP_VISUAL_MODES, collisionHueRotations, terrainColorForMode } from '@/data/mapVisualModes';
import { MAP_ICONS, mapIconById, type MapIconCategory } from '@/data/mapIcons';
import { MapIconGlyph } from '@/components/map/MapIconGlyph';
import { useSettingsStore } from '@/store/settingsStore';
import type { MapMarker, MapStamp, MapTerrainStroke, TerrainKind, VisualMode } from '@/types/domain';

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

type Tool = 'pan' | 'marker' | 'terrain' | 'stamp';
type Selection = { kind: 'marker' | 'terrain' | 'stamp'; id: string } | null;

const STAMP_COLORS = ['#4F7942', '#8B8378', '#5B8FB0', '#A9A374', '#7A5C3E', '#6B6E7A'];

/** Distance (map units) a point must move before it's added to the live stroke. */
const MIN_POINT_SPACING = 4;

/**
 * The map workspace.
 *
 * Three kinds of content share one canvas: markers (records that point at
 * canonical Location documents — the map is a second view of the world, not
 * a second copy of it), painted terrain strokes, and decorative stamps.
 * Terrain paints first, stamps sit on top of it, and markers stay on top of
 * everything since they're the interactive, functional layer.
 */
export function MapBuilder({ mapId: requestedMapId }: { mapId?: string | null }) {
  const bundle = useProjectStore((s) => s.bundle);
  const createMap = useProjectStore((s) => s.createMap);
  const updateMap = useProjectStore((s) => s.updateMap);
  const createMarker = useProjectStore((s) => s.createMarker);
  const updateMarker = useProjectStore((s) => s.updateMarker);
  const deleteMarker = useProjectStore((s) => s.deleteMarker);
  const createTerrainStroke = useProjectStore((s) => s.createTerrainStroke);
  const updateTerrainStroke = useProjectStore((s) => s.updateTerrainStroke);
  const deleteTerrainStroke = useProjectStore((s) => s.deleteTerrainStroke);
  const createStamp = useProjectStore((s) => s.createStamp);
  const updateStamp = useProjectStore((s) => s.updateStamp);
  const deleteStamp = useProjectStore((s) => s.deleteStamp);
  const confirm = useUiStore((s) => s.confirm);
  const { openEntity } = useNavigation();

  const maps = bundle?.maps ?? [];
  const [selectedMapId, setSelectedMapId] = useState<string | null>(
    requestedMapId ?? maps[0]?.id ?? null,
  );
  const map = maps.find((m) => m.id === selectedMapId) ?? maps[0] ?? null;

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 0.7 });
  const [tool, setTool] = useState<Tool>('pan');
  const [selection, setSelection] = useState<Selection>(null);
  const [activeTerrain, setActiveTerrain] = useState<TerrainKind>('grass');
  const [brushSize, setBrushSize] = useState(24);
  const [activeIcon, setActiveIcon] = useState('tree');
  const [activeStampColor, setActiveStampColor] = useState(STAMP_COLORS[0]);
  const [livePoints, setLivePoints] = useState<Array<{ x: number; y: number }> | null>(null);
  // Starts from the app-wide visual mode (Settings → Appearance) so a
  // freshly opened map already matches; from there it's a per-session
  // override, same as the tool/brush state above. Custom themes only restyle
  // app chrome, not terrain, so they have no entry in this dropdown — a
  // 'custom' app-wide mode falls back to Natural here.
  const appVisualMode = useSettingsStore((s) => s.settings.appearance.visualMode);
  const [visualMode, setVisualMode] = useState<VisualMode>(
    appVisualMode === 'custom' ? 'natural' : appVisualMode,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const dragState = useRef<{ pointerId: number; kind: 'marker' | 'stamp'; id: string } | null>(null);
  const terrainDragState = useRef<{
    pointerId: number;
    id: string;
    startX: number;
    startY: number;
    original: Array<{ x: number; y: number }>;
  } | null>(null);
  const paintingRef = useRef<{ pointerId: number; points: Array<{ x: number; y: number }> } | null>(null);
  const undoStack = useRef<Array<{ kind: 'terrain' | 'stamp'; id: string }>>([]);
  const [, forceUndoRerender] = useState(0);

  // Multi-touch: every currently-down pointer, by id, in client coordinates.
  // Pointer Events already unify mouse, pen and touch input (and `touch-none`
  // below stops the browser's own pinch/scroll from fighting this), so a
  // second finger touching down is enough to detect a pinch — no separate
  // touchstart/touchmove handlers are needed alongside the pointer ones.
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchState = useRef<{ distance: number } | null>(null);

  const markers = useMemo(
    () => (map ? (bundle?.markers ?? []).filter((marker) => marker.mapId === map.id) : []),
    [bundle?.markers, map],
  );
  const terrainStrokes = useMemo(
    () =>
      map
        ? (bundle?.terrain ?? []).filter((t) => t.mapId === map.id).sort((a, b) => a.order - b.order)
        : [],
    [bundle?.terrain, map],
  );
  const stamps = useMemo(
    () =>
      map
        ? (bundle?.stamps ?? []).filter((s) => s.mapId === map.id).sort((a, b) => a.order - b.order)
        : [],
    [bundle?.stamps, map],
  );

  // "Hue Shift on Collision": recomputed only when the mode is active and the
  // strokes actually change — every other mode reads a fixed palette instead.
  const hueRotations = useMemo(
    () => (visualMode === 'hueShift' ? collisionHueRotations(terrainStrokes) : new Map<string, number>()),
    [visualMode, terrainStrokes],
  );

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    if (requestedMapId) setSelectedMapId(requestedMapId);
  }, [requestedMapId]);

  // Switching maps always clears whatever was selected/mid-stroke. Tool
  // changes are deliberately *not* watched here — placing a marker or
  // stamp switches back to the pan tool as part of selecting what it just
  // created, and an effect keyed on `tool` would immediately clobber that
  // selection in the next render. Toolbar buttons that change tools clear
  // the selection themselves instead, where that's actually wanted.
  useEffect(() => {
    setSelection(null);
    paintingRef.current = null;
    setLivePoints(null);
  }, [map?.id]);

  const chooseTool = useCallback((next: Tool) => {
    setTool(next);
    setSelection(null);
    paintingRef.current = null;
    setLivePoints(null);
  }, []);

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
    const frame = requestAnimationFrame(fitToView);
    return () => cancelAnimationFrame(frame);
  }, [fitToView, map?.id]);

  const pushUndo = useCallback((entry: { kind: 'terrain' | 'stamp'; id: string }) => {
    undoStack.current.push(entry);
    forceUndoRerender((n) => n + 1);
  }, []);

  const undoLast = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    if (entry.kind === 'terrain') deleteTerrainStroke(entry.id);
    else deleteStamp(entry.id);
    setSelection((current) => (current?.id === entry.id ? null : current));
    forceUndoRerender((n) => n + 1);
  }, [deleteTerrainStroke, deleteStamp]);

  if (!bundle) return null;

  if (!map) {
    return (
      <EmptyState
        icon={MapPin}
        title="No map yet."
        body="Draw the shape of your world — paint terrain, drop scenery, and place markers that link straight to the locations already in your library."
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

  const activeMarker = selection?.kind === 'marker' ? markers.find((m) => m.id === selection.id) ?? null : null;
  const activeTerrainStroke =
    selection?.kind === 'terrain' ? terrainStrokes.find((t) => t.id === selection.id) ?? null : null;
  const activeStamp = selection?.kind === 'stamp' ? stamps.find((s) => s.id === selection.id) ?? null : null;

  const cursor =
    tool === 'terrain' || tool === 'stamp' || tool === 'marker' ? 'cursor-crosshair' : 'cursor-grab';

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full min-h-0 flex-col',
        isFullscreen && 'bg-[var(--color-canvas)]',
      )}
    >
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

        <Tooltip label="Visual mode">
          <Select
            value={visualMode}
            aria-label="Visual mode"
            onChange={(event) => setVisualMode(event.target.value as VisualMode)}
            className="w-40 text-[0.78rem]"
          >
            {MAP_VISUAL_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </Select>
        </Tooltip>

        <div className="flex items-center gap-0.5 rounded-[var(--radius-control)] border border-[var(--color-line)] p-0.5">
          <Tooltip label="Select & pan">
            <Button
              variant={tool === 'pan' ? 'primary' : 'ghost'}
              size="icon-sm"
              aria-label="Select and pan"
              aria-pressed={tool === 'pan'}
              onClick={() => chooseTool('pan')}
            >
              <MousePointer2 size={13} />
            </Button>
          </Tooltip>
          <Tooltip label="Add marker">
            <Button
              variant={tool === 'marker' ? 'primary' : 'ghost'}
              size="icon-sm"
              aria-label="Add marker"
              aria-pressed={tool === 'marker'}
              onClick={() => chooseTool('marker')}
            >
              <MapPin size={13} />
            </Button>
          </Tooltip>
          <Tooltip label="Paint terrain">
            <Button
              variant={tool === 'terrain' ? 'primary' : 'ghost'}
              size="icon-sm"
              aria-label="Paint terrain"
              aria-pressed={tool === 'terrain'}
              onClick={() => chooseTool('terrain')}
            >
              <Paintbrush size={13} />
            </Button>
          </Tooltip>
          <Tooltip label="Place stamps">
            <Button
              variant={tool === 'stamp' ? 'primary' : 'ghost'}
              size="icon-sm"
              aria-label="Place stamps"
              aria-pressed={tool === 'stamp'}
              onClick={() => chooseTool('stamp')}
            >
              <Sparkles size={13} />
            </Button>
          </Tooltip>
        </div>

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
          {typeof document.exitFullscreen === 'function' && (
            <Tooltip label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                aria-pressed={isFullscreen}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
              </Button>
            </Tooltip>
          )}
        </div>
      </header>

      {tool === 'terrain' && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-3 py-2">
          <div className="flex items-center gap-1">
            {TERRAIN_TYPES.map((terrain) => (
              <Tooltip key={terrain.id} label={terrain.label}>
                <button
                  type="button"
                  aria-label={`Paint ${terrain.label}`}
                  aria-pressed={activeTerrain === terrain.id}
                  onClick={() => setActiveTerrain(terrain.id)}
                  className={cn(
                    'h-6 w-6 shrink-0 rounded-full border-2 transition-transform',
                    activeTerrain === terrain.id
                      ? 'scale-110 border-[var(--color-ink)]'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: terrainColorForMode(terrain.id, visualMode) }}
                />
              </Tooltip>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-[0.72rem] text-[var(--color-ink-faint)]">
            Brush
            <input
              type="range"
              min={6}
              max={160}
              value={brushSize}
              aria-label="Brush size"
              onChange={(event) => setBrushSize(Number(event.target.value))}
              className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-accent)]"
            />
            <span className="w-7 font-mono tabular-nums">{brushSize}</span>
          </label>
          <Tooltip label="Undo last stroke">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Undo last stroke"
              disabled={undoStack.current.length === 0}
              onClick={undoLast}
            >
              <Undo2 size={13} />
            </Button>
          </Tooltip>
        </div>
      )}

      {tool === 'stamp' && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            {(['Nature', 'Structures', 'Travel', 'Camp'] as MapIconCategory[]).map((category) => (
              <div key={category} className="flex items-center gap-0.5">
                {MAP_ICONS.filter((icon) => icon.category === category).map((icon) => (
                  <Tooltip key={icon.id} label={icon.label}>
                    <button
                      type="button"
                      aria-label={`Place ${icon.label}`}
                      aria-pressed={activeIcon === icon.id}
                      onClick={() => setActiveIcon(icon.id)}
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] border transition-colors',
                        activeIcon === icon.id
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                          : 'border-transparent text-[var(--color-ink-muted)] hover:bg-[var(--color-overlay)]',
                      )}
                    >
                      <svg viewBox="0 0 24 24" width={16} height={16}>
                        <MapIconGlyph shapes={icon.shapes} />
                      </svg>
                    </button>
                  </Tooltip>
                ))}
                <span className="mx-0.5 h-4 w-px bg-[var(--color-line)] last:hidden" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {STAMP_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Stamp color ${color}`}
                aria-pressed={activeStampColor === color}
                onClick={() => setActiveStampColor(color)}
                className={cn(
                  'h-5 w-5 shrink-0 rounded-full border-2 transition-transform',
                  activeStampColor === color
                    ? 'scale-110 border-[var(--color-ink)]'
                    : 'border-transparent hover:scale-105',
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <Tooltip label="Undo last stamp">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Undo last stamp"
              disabled={undoStack.current.length === 0}
              onClick={undoLast}
            >
              <Undo2 size={13} />
            </Button>
          </Tooltip>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <svg
          ref={svgRef}
          role="application"
          aria-label={`${map.name} — pan with drag, zoom with the scroll wheel or a two-finger pinch`}
          className={`h-full w-full touch-none ${cursor}`}
          onWheel={(event) => {
            const rect = svgRef.current?.getBoundingClientRect();
            zoomBy(
              event.deltaY < 0 ? 1.1 : 1 / 1.1,
              rect ? event.clientX - rect.left : undefined,
              rect ? event.clientY - rect.top : undefined,
            );
          }}
          onPointerDown={(event) => {
            activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (activePointers.current.size === 2) {
              // A second finger just landed — this becomes a pinch, not
              // whatever the active tool would otherwise do with one pointer.
              panState.current = null;
              dragState.current = null;
              terrainDragState.current = null;
              if (paintingRef.current) {
                paintingRef.current = null;
                setLivePoints(null);
              }
              const [a, b] = [...activePointers.current.values()];
              pinchState.current = { distance: Math.hypot(a.x - b.x, a.y - b.y) };
              return;
            }
            if (activePointers.current.size > 2) return;

            if (tool === 'marker') {
              const point = toMapSpace(event.clientX, event.clientY);
              const id = createMarker({ mapId: map.id, x: point.x, y: point.y, label: 'New marker' });
              setSelection({ kind: 'marker', id });
              setTool('pan');
              return;
            }
            if (tool === 'terrain') {
              const point = toMapSpace(event.clientX, event.clientY);
              paintingRef.current = { pointerId: event.pointerId, points: [point] };
              setLivePoints([point]);
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }
            if (tool === 'stamp') {
              const point = toMapSpace(event.clientX, event.clientY);
              const id = createStamp({
                mapId: map.id,
                icon: activeIcon,
                x: point.x,
                y: point.y,
                color: activeStampColor,
              });
              pushUndo({ kind: 'stamp', id });
              return;
            }
            // Pan/select mode: clicking empty canvas clears selection and pans.
            setSelection(null);
            if (dragState.current || terrainDragState.current) return;
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
            if (activePointers.current.has(event.pointerId)) {
              activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            }
            if (activePointers.current.size === 2 && pinchState.current) {
              const [a, b] = [...activePointers.current.values()];
              const distance = Math.hypot(a.x - b.x, a.y - b.y);
              if (pinchState.current.distance > 0) {
                const rect = svgRef.current?.getBoundingClientRect();
                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;
                zoomBy(
                  distance / pinchState.current.distance,
                  rect ? midX - rect.left : undefined,
                  rect ? midY - rect.top : undefined,
                );
              }
              pinchState.current.distance = distance;
              return;
            }
            const painting = paintingRef.current;
            if (painting && painting.pointerId === event.pointerId) {
              const point = toMapSpace(event.clientX, event.clientY);
              const last = painting.points[painting.points.length - 1];
              const dist = Math.hypot(point.x - last.x, point.y - last.y);
              if (dist >= MIN_POINT_SPACING) {
                painting.points.push(point);
                setLivePoints([...painting.points]);
              }
              return;
            }
            const terrainDrag = terrainDragState.current;
            if (terrainDrag && terrainDrag.pointerId === event.pointerId) {
              const point = toMapSpace(event.clientX, event.clientY);
              const dx = point.x - terrainDrag.startX;
              const dy = point.y - terrainDrag.startY;
              updateTerrainStroke(terrainDrag.id, {
                points: terrainDrag.original.map((p) => ({ x: p.x + dx, y: p.y + dy })),
              });
              return;
            }
            const drag = dragState.current;
            if (drag && drag.pointerId === event.pointerId) {
              const point = toMapSpace(event.clientX, event.clientY);
              const clamped = { x: clamp(point.x, 0, map.width), y: clamp(point.y, 0, map.height) };
              if (drag.kind === 'marker') updateMarker(drag.id, clamped);
              else updateStamp(drag.id, clamped);
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
            activePointers.current.delete(event.pointerId);
            if (activePointers.current.size < 2) pinchState.current = null;
            const painting = paintingRef.current;
            if (painting && painting.pointerId === event.pointerId) {
              paintingRef.current = null;
              setLivePoints(null);
              const points =
                painting.points.length > 1 ? painting.points : [painting.points[0], painting.points[0]];
              const id = createTerrainStroke({
                mapId: map.id,
                terrain: activeTerrain,
                points,
                brushSize,
              });
              pushUndo({ kind: 'terrain', id });
            }
            panState.current = null;
            dragState.current = null;
            terrainDragState.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={(event) => {
            activePointers.current.delete(event.pointerId);
            pinchState.current = null;
            panState.current = null;
            dragState.current = null;
            terrainDragState.current = null;
            paintingRef.current = null;
            setLivePoints(null);
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

            {terrainStrokes.map((stroke) => (
              <TerrainStrokeGlyph
                key={stroke.id}
                stroke={stroke}
                color={terrainColorForMode(stroke.terrain, visualMode)}
                hueRotation={hueRotations.get(stroke.id)}
                active={selection?.kind === 'terrain' && selection.id === stroke.id}
                interactive={tool === 'pan'}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setSelection({ kind: 'terrain', id: stroke.id });
                  const point = toMapSpace(event.clientX, event.clientY);
                  terrainDragState.current = {
                    pointerId: event.pointerId,
                    id: stroke.id,
                    startX: point.x,
                    startY: point.y,
                    original: stroke.points,
                  };
                  (event.currentTarget.ownerSVGElement as SVGSVGElement)?.setPointerCapture(
                    event.pointerId,
                  );
                }}
              />
            ))}

            {livePoints && livePoints.length > 0 && (
              <path
                d={pathFromPoints(livePoints.length > 1 ? livePoints : [livePoints[0], livePoints[0]])}
                fill="none"
                stroke={terrainColorForMode(activeTerrain, visualMode)}
                strokeOpacity={0.55}
                strokeWidth={brushSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            )}

            {stamps.map((stamp) => (
              <StampGlyph
                key={stamp.id}
                stamp={stamp}
                active={selection?.kind === 'stamp' && selection.id === stamp.id}
                interactive={tool === 'pan'}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setSelection({ kind: 'stamp', id: stamp.id });
                  dragState.current = { pointerId: event.pointerId, kind: 'stamp', id: stamp.id };
                  (event.currentTarget.ownerSVGElement as SVGSVGElement)?.setPointerCapture(
                    event.pointerId,
                  );
                }}
              />
            ))}

            {markers.map((marker) => (
              <MarkerGlyph
                key={marker.id}
                marker={marker}
                scale={viewport.scale}
                active={selection?.kind === 'marker' && selection.id === marker.id}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setSelection({ kind: 'marker', id: marker.id });
                  dragState.current = { pointerId: event.pointerId, kind: 'marker', id: marker.id };
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
            onClose={() => setSelection(null)}
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
                setSelection(null);
              }
            }}
          />
        )}

        {activeTerrainStroke && (
          <TerrainInspector
            stroke={activeTerrainStroke}
            visualMode={visualMode}
            onClose={() => setSelection(null)}
            onChangeTerrain={(terrain) => updateTerrainStroke(activeTerrainStroke.id, { terrain })}
            onChangeBrushSize={(brushSizeNext) =>
              updateTerrainStroke(activeTerrainStroke.id, { brushSize: brushSizeNext })
            }
            onDelete={() => {
              deleteTerrainStroke(activeTerrainStroke.id);
              setSelection(null);
            }}
          />
        )}

        {activeStamp && (
          <StampInspector
            stamp={activeStamp}
            onClose={() => setSelection(null)}
            onChangeRotation={(rotation) => updateStamp(activeStamp.id, { rotation })}
            onChangeScale={(scale) => updateStamp(activeStamp.id, { scale })}
            onChangeColor={(color) => updateStamp(activeStamp.id, { color })}
            onDelete={() => {
              deleteStamp(activeStamp.id);
              setSelection(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function pathFromPoints(points: Array<{ x: number; y: number }>): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

function TerrainStrokeGlyph({
  stroke,
  color,
  hueRotation,
  active,
  interactive,
  onPointerDown,
}: {
  stroke: MapTerrainStroke;
  /** The base paint color for this stroke's terrain under the active visual mode. */
  color: string;
  /** Degrees of `hue-rotate` to apply — only set under "Hue Shift on Collision". */
  hueRotation?: number;
  active: boolean;
  interactive: boolean;
  onPointerDown: (event: React.PointerEvent<SVGPathElement>) => void;
}) {
  const d = pathFromPoints(stroke.points);
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={active ? 0.8 : 0.55}
        strokeWidth={stroke.brushSize}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
        style={hueRotation ? { filter: `hue-rotate(${hueRotation}deg)` } : undefined}
      />
      {active && (
        <path
          d={d}
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity={0.35}
          strokeWidth={stroke.brushSize + 6}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(stroke.brushSize, 22)}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={interactive ? 'cursor-pointer' : undefined}
        pointerEvents={interactive ? 'stroke' : 'none'}
        onPointerDown={onPointerDown}
      />
    </>
  );
}

function StampGlyph({
  stamp,
  active,
  interactive,
  onPointerDown,
}: {
  stamp: MapStamp;
  active: boolean;
  interactive: boolean;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const icon = mapIconById(stamp.icon);
  if (!icon) return null;
  // Icons are drawn on a 24×24 box; centered and sized in map units.
  const box = 28 * stamp.scale;
  return (
    <g
      transform={`translate(${stamp.x} ${stamp.y}) rotate(${stamp.rotation}) scale(${box / 24})`}
      className={interactive ? 'cursor-pointer' : undefined}
      pointerEvents={interactive ? 'auto' : 'none'}
      onPointerDown={onPointerDown}
      style={{ color: stamp.color }}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? icon.label : undefined}
    >
      <g transform="translate(-12 -12)">
        {active && (
          <circle cx={12} cy={12} r={16} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
        )}
        {/* An icon's own shapes are often thin or irregular (a rock's
            outline, a signpost's post) — this invisible disc gives the
            whole nominal icon box a comfortable, uniform click/drag target
            instead of only the painted pixels. */}
        <circle cx={12} cy={12} r={13} fill="transparent" pointerEvents={interactive ? 'all' : 'none'} />
        <MapIconGlyph shapes={icon.shapes} />
      </g>
    </g>
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

function TerrainInspector({
  stroke,
  visualMode,
  onClose,
  onChangeTerrain,
  onChangeBrushSize,
  onDelete,
}: {
  stroke: MapTerrainStroke;
  visualMode: VisualMode;
  onClose: () => void;
  onChangeTerrain: (terrain: TerrainKind) => void;
  onChangeBrushSize: (size: number) => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute right-3 bottom-3 w-64 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] p-3 shadow-[var(--shadow-float)] animate-rise">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="type-label">Terrain stroke</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close terrain details"
          className="text-[0.7rem] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
        >
          Done
        </button>
      </div>

      <div className="mb-2 flex items-center gap-1">
        {TERRAIN_TYPES.map((terrain) => (
          <Tooltip key={terrain.id} label={terrain.label}>
            <button
              type="button"
              aria-label={terrain.label}
              aria-pressed={stroke.terrain === terrain.id}
              onClick={() => onChangeTerrain(terrain.id)}
              className={cn(
                'h-6 w-6 shrink-0 rounded-full border-2 transition-transform',
                stroke.terrain === terrain.id
                  ? 'scale-110 border-[var(--color-ink)]'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: terrainColorForMode(terrain.id, visualMode) }}
            />
          </Tooltip>
        ))}
      </div>

      <label className="mb-2 flex items-center gap-1.5 text-[0.72rem] text-[var(--color-ink-faint)]">
        Width
        <input
          type="range"
          min={6}
          max={160}
          value={stroke.brushSize}
          aria-label="Stroke width"
          onChange={(event) => onChangeBrushSize(Number(event.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-accent)]"
        />
        <span className="w-7 font-mono tabular-nums">{stroke.brushSize}</span>
      </label>

      <Button variant="ghost" size="icon-sm" aria-label="Delete stroke" onClick={onDelete}>
        <Trash2 size={13} className="text-[var(--color-danger)]" />
      </Button>
    </div>
  );
}

function StampInspector({
  stamp,
  onClose,
  onChangeRotation,
  onChangeScale,
  onChangeColor,
  onDelete,
}: {
  stamp: MapStamp;
  onClose: () => void;
  onChangeRotation: (rotation: number) => void;
  onChangeScale: (scale: number) => void;
  onChangeColor: (color: string) => void;
  onDelete: () => void;
}) {
  const icon = mapIconById(stamp.icon);
  return (
    <div className="absolute right-3 bottom-3 w-64 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] p-3 shadow-[var(--shadow-float)] animate-rise">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="type-label">{icon?.label ?? 'Stamp'}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close stamp details"
          className="text-[0.7rem] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
        >
          Done
        </button>
      </div>

      <label className="mb-2 flex items-center gap-1.5 text-[0.72rem] text-[var(--color-ink-faint)]">
        Rotation
        <input
          type="range"
          min={0}
          max={359}
          value={stamp.rotation}
          aria-label="Stamp rotation"
          onChange={(event) => onChangeRotation(Number(event.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-accent)]"
        />
      </label>

      <label className="mb-2 flex items-center gap-1.5 text-[0.72rem] text-[var(--color-ink-faint)]">
        Size
        <input
          type="range"
          min={0.4}
          max={2.5}
          step={0.1}
          value={stamp.scale}
          aria-label="Stamp size"
          onChange={(event) => onChangeScale(Number(event.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-accent)]"
        />
      </label>

      <div className="mb-2 flex items-center gap-1">
        {STAMP_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Color ${color}`}
            aria-pressed={stamp.color === color}
            onClick={() => onChangeColor(color)}
            className={cn(
              'h-5 w-5 shrink-0 rounded-full border-2 transition-transform',
              stamp.color === color
                ? 'scale-110 border-[var(--color-ink)]'
                : 'border-transparent hover:scale-105',
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <Button variant="ghost" size="icon-sm" aria-label="Delete stamp" onClick={onDelete}>
        <Trash2 size={13} className="text-[var(--color-danger)]" />
      </Button>
    </div>
  );
}
