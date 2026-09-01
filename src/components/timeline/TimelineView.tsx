import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarPlus,
  Eye,
  EyeOff,
  Layers,
  Minus,
  Plus,
  Rows3,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { EventCard } from '@/components/timeline/EventCard';
import { EventDrawer } from '@/components/timeline/EventDrawer';
import {
  assignRows,
  EVENT_HEIGHT,
  GUTTER_WIDTH,
  HEADER_HEIGHT,
  laneRowCount,
  ROW_GAP,
  SECTION_ROW_HEIGHT,
  timelineBounds,
} from '@/components/timeline/timelineLayout';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { MenuHost, useMenu, type MenuEntry } from '@/components/ui/Menu';
import { clamp, formatPosition, snapPosition, tickInterval } from '@/utils/time';
import { withAlpha } from '@/utils/color';
import { cn } from '@/utils/cn';
import type { PointOfView, SectionKind, TimelineEvent } from '@/types/domain';

const SECTION_KINDS: SectionKind[] = ['era', 'act', 'arc', 'chapter'];

interface DragState {
  mode: 'move' | 'resize';
  eventId: string;
  pointerId: number;
  startClientX: number;
  originStart: number;
  originDuration: number;
  originLaneId: string | null;
}

interface SectionDragState {
  mode: 'move' | 'resize-start' | 'resize-end';
  sectionId: string;
  pointerId: number;
  startClientX: number;
  originStart: number;
  originEnd: number;
}

/**
 * The Timeline Mapper.
 *
 * A horizontally-scrolling chronology built from plain elements and pointer
 * events rather than a calendar component, because story time is abstract:
 * chapters, acts and eras all live on the same numeric axis.
 */
export function TimelineView() {
  const bundle = useProjectStore((s) => s.bundle);
  const createEvent = useProjectStore((s) => s.createEvent);
  const updateEvent = useProjectStore((s) => s.updateEvent);
  const createPov = useProjectStore((s) => s.createPov);
  const updatePov = useProjectStore((s) => s.updatePov);
  const deletePov = useProjectStore((s) => s.deletePov);
  const createSection = useProjectStore((s) => s.createSection);
  const updateSection = useProjectStore((s) => s.updateSection);
  const deleteSection = useProjectStore((s) => s.deleteSection);
  const confirm = useUiStore((s) => s.confirm);

  const [pixelsPerUnit, setPixelsPerUnit] = useState(76);
  const [swimlanes, setSwimlanes] = useState(true);
  const [isolatedPovId, setIsolatedPovId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [drawerEventId, setDrawerEventId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const sectionDragRef = useRef<SectionDragState | null>(null);
  const povMenu = useMenu();
  const [povMenuTarget, setPovMenuTarget] = useState<PointOfView | null>(null);

  const events = bundle?.events ?? [];
  const povs = useMemo(
    () => [...(bundle?.povs ?? [])].sort((a, b) => a.order - b.order),
    [bundle?.povs],
  );
  const sections = bundle?.sections ?? [];

  const bounds = useMemo(() => timelineBounds(events, sections), [events, sections]);
  const trackWidth = Math.max(900, (bounds.max - bounds.min) * pixelsPerUnit);

  const toX = useCallback(
    (position: number) => (position - bounds.min) * pixelsPerUnit,
    [bounds.min, pixelsPerUnit],
  );

  // Opening an event from another view arrives as a window event so the
  // navigation helper does not need to know this component's internals.
  useEffect(() => {
    const onSelect = (customEvent: Event) => {
      const id = (customEvent as CustomEvent<string>).detail;
      setSelectedEventId(id);
      setDrawerEventId(id);
      const target = (bundle?.events ?? []).find((item) => item.id === id);
      if (target && scrollRef.current) {
        scrollRef.current.scrollTo({
          left: Math.max(0, toX(target.start) - 200),
          behavior: 'smooth',
        });
      }
    };
    window.addEventListener('creatura:select-event', onSelect);
    return () => window.removeEventListener('creatura:select-event', onSelect);
  }, [bundle?.events, toX]);

  const visiblePovs = useMemo(() => {
    if (isolatedPovId) return povs.filter((pov) => pov.id === isolatedPovId);
    return povs.filter((pov) => pov.visible);
  }, [povs, isolatedPovId]);

  /** Lanes to render: one per visible POV plus a catch-all, or a single row. */
  const lanes = useMemo(() => {
    if (!swimlanes) {
      return [{ id: null as string | null, name: 'All events', color: '#F5B942', events }];
    }
    const assigned = visiblePovs.map((pov) => ({
      id: pov.id,
      name: pov.name,
      color: pov.color,
      events: events.filter((event) => event.povId === pov.id),
    }));
    const unassigned = events.filter(
      (event) => !event.povId || !povs.some((pov) => pov.id === event.povId),
    );
    if (unassigned.length > 0 && !isolatedPovId) {
      assigned.push({
        id: '__unassigned__',
        name: 'No POV',
        color: '#7C8AA3',
        events: unassigned,
      });
    }
    return assigned;
  }, [swimlanes, visiblePovs, events, povs, isolatedPovId]);

  const laneLayouts = useMemo(
    () =>
      lanes.map((lane) => {
        const rows = assignRows(lane.events);
        const rowCount = laneRowCount(lane.events, rows);
        return {
          ...lane,
          rows,
          height: rowCount * (EVENT_HEIGHT + ROW_GAP) + ROW_GAP + 22,
        };
      }),
    [lanes],
  );

  const sectionRows = useMemo(() => {
    const byKind = new Map<SectionKind, typeof sections>();
    for (const kind of SECTION_KINDS) {
      const items = sections.filter((section) => section.kind === kind);
      if (items.length > 0) byKind.set(kind, items);
    }
    return [...byKind.entries()];
  }, [sections]);

  // ── event dragging ──────────────────────────────────────────────────────
  const beginDrag = (
    pointerEvent: React.PointerEvent<HTMLDivElement>,
    mode: 'move' | 'resize',
    event: TimelineEvent,
  ) => {
    pointerEvent.preventDefault();
    setSelectedEventId(event.id);
    dragRef.current = {
      mode,
      eventId: event.id,
      pointerId: pointerEvent.pointerId,
      startClientX: pointerEvent.clientX,
      originStart: event.start,
      originDuration: event.duration,
      originLaneId: event.povId,
    };
    (pointerEvent.currentTarget as HTMLElement).setPointerCapture(pointerEvent.pointerId);
  };

  const onPointerMove = (pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag && drag.pointerId === pointerEvent.pointerId) {
      const deltaUnits = (pointerEvent.clientX - drag.startClientX) / pixelsPerUnit;
      if (drag.mode === 'move') {
        updateEvent(drag.eventId, {
          start: snapPosition(drag.originStart + deltaUnits, pixelsPerUnit),
        });
      } else {
        updateEvent(drag.eventId, {
          duration: Math.max(
            0.25,
            snapPosition(drag.originDuration + deltaUnits, pixelsPerUnit),
          ),
        });
      }
      return;
    }

    const sectionDrag = sectionDragRef.current;
    if (sectionDrag && sectionDrag.pointerId === pointerEvent.pointerId) {
      const deltaUnits = (pointerEvent.clientX - sectionDrag.startClientX) / pixelsPerUnit;
      const snapped = snapPosition(deltaUnits, pixelsPerUnit);
      if (sectionDrag.mode === 'move') {
        updateSection(sectionDrag.sectionId, {
          start: sectionDrag.originStart + snapped,
          end: sectionDrag.originEnd + snapped,
        });
      } else if (sectionDrag.mode === 'resize-start') {
        updateSection(sectionDrag.sectionId, {
          start: Math.min(sectionDrag.originStart + snapped, sectionDrag.originEnd - 1),
        });
      } else {
        updateSection(sectionDrag.sectionId, {
          end: Math.max(sectionDrag.originEnd + snapped, sectionDrag.originStart + 1),
        });
      }
    }
  };

  const endDrag = () => {
    dragRef.current = null;
    sectionDragRef.current = null;
  };

  /** Dropping an event onto a different lane reassigns its POV. */
  const dropIntoLane = (laneId: string | null) => {
    const drag = dragRef.current;
    if (!drag || drag.mode !== 'move' || !swimlanes) return;
    if (laneId === '__unassigned__') {
      if (drag.originLaneId !== null) updateEvent(drag.eventId, { povId: null });
      return;
    }
    if (laneId && laneId !== drag.originLaneId) updateEvent(drag.eventId, { povId: laneId });
  };

  if (!bundle) return null;

  const interval = tickInterval(pixelsPerUnit);
  const ticks: number[] = [];
  for (let value = Math.ceil(bounds.min / interval) * interval; value <= bounds.max; value += interval) {
    ticks.push(value);
  }

  const povEntries: MenuEntry[] = povMenuTarget
    ? [
        { id: 'h', heading: povMenuTarget.name },
        {
          id: 'isolate',
          label: isolatedPovId === povMenuTarget.id ? 'Show all POVs' : 'Isolate this POV',
          icon: Eye,
          onSelect: () =>
            setIsolatedPovId(isolatedPovId === povMenuTarget.id ? null : povMenuTarget.id),
        },
        {
          id: 'hide',
          label: povMenuTarget.visible ? 'Hide lane' : 'Show lane',
          icon: povMenuTarget.visible ? EyeOff : Eye,
          onSelect: () => updatePov(povMenuTarget.id, { visible: !povMenuTarget.visible }),
        },
        { id: 's', separator: true },
        {
          id: 'delete',
          label: 'Delete POV',
          icon: Trash2,
          destructive: true,
          onSelect: async () => {
            const ok = await confirm({
              title: `Delete the ${povMenuTarget.name} lane?`,
              body: 'Events keep their content but lose this point of view.',
              confirmLabel: 'Delete POV',
              destructive: true,
            });
            if (ok) deletePov(povMenuTarget.id);
          },
        },
      ]
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] px-3 py-2">
        <h2 className="type-display mr-1 text-[1.05rem] text-[var(--color-ink)]">Timeline</h2>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            const scroller = scrollRef.current;
            const centre = scroller
              ? bounds.min + (scroller.scrollLeft + scroller.clientWidth / 2) / pixelsPerUnit
              : bounds.min + 2;
            const id = createEvent({
              title: 'New event',
              start: Math.round(centre),
              duration: 1,
              povId: isolatedPovId ?? null,
            });
            setSelectedEventId(id);
            setDrawerEventId(id);
          }}
        >
          <CalendarPlus size={13} />
          Add event
        </Button>

        <Button variant="secondary" size="sm" onClick={() => createPov({ name: 'New POV' })}>
          <UserPlus size={13} />
          Add POV
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => createSection({ kind: 'act', name: 'New act' })}
        >
          <Layers size={13} />
          Add act
        </Button>

        <Tooltip label={swimlanes ? 'Merge into one track' : 'Split into POV swimlanes'}>
          <Button
            variant={swimlanes ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={swimlanes}
            onClick={() => setSwimlanes((value) => !value)}
          >
            <Rows3 size={13} />
            Swimlanes
          </Button>
        </Tooltip>

        {isolatedPovId && (
          <Button variant="ghost" size="sm" onClick={() => setIsolatedPovId(null)}>
            Showing one POV — show all
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Tooltip label="Zoom out">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              onClick={() => setPixelsPerUnit((value) => clamp(value / 1.3, 14, 320))}
            >
              <Minus size={14} />
            </Button>
          </Tooltip>
          <span className="w-14 text-center font-mono text-[0.68rem] text-[var(--color-ink-faint)] tabular-nums">
            {Math.round(pixelsPerUnit)}px/u
          </span>
          <Tooltip label="Zoom in">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              onClick={() => setPixelsPerUnit((value) => clamp(value * 1.3, 14, 320))}
            >
              <Plus size={14} />
            </Button>
          </Tooltip>
        </div>
      </header>

      {events.length === 0 && sections.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Nothing has happened yet."
          body="Lay out your chronology as events on a track. Drag to move them, drag the right edge to change how long they take, and give each one a point of view."
        >
          <Button
            variant="primary"
            onClick={() => {
              const id = createEvent({ title: 'The beginning', start: 1, duration: 1 });
              setSelectedEventId(id);
              setDrawerEventId(id);
            }}
          >
            <Plus size={14} />
            Add first event
          </Button>
        </EmptyState>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Fixed lane gutter */}
          <div
            className="shrink-0 border-r border-[var(--color-line)] bg-[var(--color-surface)]"
            style={{ width: GUTTER_WIDTH }}
          >
            <div
              className="border-b border-[var(--color-line)]"
              style={{ height: HEADER_HEIGHT + sectionRows.length * SECTION_ROW_HEIGHT }}
            >
              <span className="type-label block px-3 pt-2">Lanes</span>
            </div>
            <div className="scroll-thin overflow-y-auto" data-lane-gutter>
              {laneLayouts.map((lane) => {
                const pov = povs.find((item) => item.id === lane.id) ?? null;
                return (
                  <div
                    key={lane.id ?? 'all'}
                    className="flex items-start gap-2 border-b border-[var(--color-line)] px-3 py-2"
                    style={{ height: lane.height }}
                  >
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: lane.color }}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      disabled={!pov}
                      onClick={(clickEvent) => {
                        if (!pov) return;
                        setPovMenuTarget(pov);
                        povMenu.openAt(clickEvent);
                      }}
                      className="min-w-0 flex-1 text-left disabled:cursor-default"
                    >
                      <span className="type-display block truncate text-[0.95rem] leading-tight text-[var(--color-ink)]">
                        {lane.name}
                      </span>
                      <span className="block text-[0.66rem] text-[var(--color-ink-faint)]">
                        {lane.events.length} {lane.events.length === 1 ? 'event' : 'events'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scrolling track */}
          <div
            ref={scrollRef}
            className="scroll-thin min-w-0 flex-1 overflow-x-auto overflow-y-auto"
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div style={{ width: trackWidth }}>
              {/* Axis */}
              <div
                className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-canvas)]"
                style={{ height: HEADER_HEIGHT + sectionRows.length * SECTION_ROW_HEIGHT }}
              >
                <div className="relative" style={{ height: HEADER_HEIGHT }}>
                  {ticks.map((tick) => (
                    <div
                      key={tick}
                      className="absolute top-0 flex h-full items-end pb-1 pl-1"
                      style={{ left: toX(tick) }}
                    >
                      <span className="font-mono text-[0.66rem] whitespace-nowrap text-[var(--color-ink-faint)]">
                        {formatPosition(tick, bundle.project)}
                      </span>
                    </div>
                  ))}
                </div>

                {sectionRows.map(([kind, items]) => (
                  <div key={kind} className="relative" style={{ height: SECTION_ROW_HEIGHT }}>
                    {items.map((section) => (
                      <div
                        key={section.id}
                        className="group absolute top-0.5 flex h-[18px] cursor-grab touch-none items-center overflow-hidden rounded-sm px-1.5 active:cursor-grabbing"
                        style={{
                          left: toX(section.start),
                          width: Math.max(24, (section.end - section.start) * pixelsPerUnit),
                          backgroundColor: withAlpha(section.color, 0.2),
                          borderLeft: `2px solid ${section.color}`,
                        }}
                        onPointerDown={(pointerEvent) => {
                          pointerEvent.preventDefault();
                          sectionDragRef.current = {
                            mode: 'move',
                            sectionId: section.id,
                            pointerId: pointerEvent.pointerId,
                            startClientX: pointerEvent.clientX,
                            originStart: section.start,
                            originEnd: section.end,
                          };
                          (pointerEvent.currentTarget as HTMLElement).setPointerCapture(
                            pointerEvent.pointerId,
                          );
                        }}
                        onDoubleClick={() => {
                          const name = window.prompt('Section name', section.name);
                          if (name !== null) updateSection(section.id, { name: name.trim() || section.name });
                        }}
                        title={`${section.name} — drag to move, drag the edge to resize, double-click to rename`}
                      >
                        <span className="truncate text-[0.64rem] font-medium tracking-wide uppercase" style={{ color: section.color }}>
                          {section.name}
                        </span>
                        <button
                          type="button"
                          aria-label={`Delete ${section.name}`}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Delete “${section.name}”?`,
                              confirmLabel: 'Delete',
                              destructive: true,
                            });
                            if (ok) deleteSection(section.id);
                          }}
                          className="ml-auto shrink-0 pl-1 text-[0.6rem] opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ color: section.color }}
                        >
                          ✕
                        </button>
                        <div
                          role="separator"
                          aria-label={`Resize ${section.name}`}
                          className="absolute top-0 right-0 h-full w-1.5 cursor-ew-resize touch-none"
                          onPointerDown={(pointerEvent) => {
                            pointerEvent.preventDefault();
                            pointerEvent.stopPropagation();
                            sectionDragRef.current = {
                              mode: 'resize-end',
                              sectionId: section.id,
                              pointerId: pointerEvent.pointerId,
                              startClientX: pointerEvent.clientX,
                              originStart: section.start,
                              originEnd: section.end,
                            };
                            (pointerEvent.currentTarget as HTMLElement).setPointerCapture(
                              pointerEvent.pointerId,
                            );
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Lanes */}
              {laneLayouts.map((lane) => (
                <div
                  key={lane.id ?? 'all'}
                  className="relative border-b border-[var(--color-line)]"
                  style={{ height: lane.height }}
                  onPointerUp={() => dropIntoLane(lane.id)}
                >
                  {/* Gridlines */}
                  {ticks.map((tick) => (
                    <div
                      key={tick}
                      className="absolute top-0 bottom-0 w-px bg-[var(--color-line)] opacity-40"
                      style={{ left: toX(tick) }}
                      aria-hidden="true"
                    />
                  ))}

                  {lane.events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      pov={povs.find((pov) => pov.id === event.povId) ?? null}
                      left={toX(event.start)}
                      width={Math.max(event.duration, 0.4) * pixelsPerUnit}
                      top={
                        (lane.rows.get(event.id) ?? 0) * (EVENT_HEIGHT + ROW_GAP) + ROW_GAP
                      }
                      selected={event.id === selectedEventId}
                      onOpen={(id) => {
                        setSelectedEventId(id);
                        setDrawerEventId(id);
                      }}
                      onDragStart={(pointerEvent, mode) => beginDrag(pointerEvent, mode, event)}
                    />
                  ))}

                  {lane.events.length === 0 && (
                    <p className="absolute top-1/2 left-4 -translate-y-1/2 text-[0.72rem] text-[var(--color-ink-faint)]">
                      Drag an event here to give it this point of view.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <EventDrawer eventId={drawerEventId} onClose={() => setDrawerEventId(null)} />
      <MenuHost
        anchor={povMenu.anchor}
        entries={povEntries}
        onClose={() => {
          povMenu.close();
          setPovMenuTarget(null);
        }}
      />
      <span className={cn('sr-only')} aria-live="polite">
        {selectedEventId
          ? `Selected ${events.find((e) => e.id === selectedEventId)?.title ?? ''}`
          : ''}
      </span>
    </div>
  );
}
