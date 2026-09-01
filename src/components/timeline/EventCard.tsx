import { memo } from 'react';
import { MapPin, Users } from 'lucide-react';
import type { PointOfView, TimelineEvent } from '@/types/domain';
import { withAlpha } from '@/utils/color';
import { cn } from '@/utils/cn';
import { EVENT_HEIGHT } from '@/components/timeline/timelineLayout';

interface EventCardProps {
  event: TimelineEvent;
  pov: PointOfView | null;
  left: number;
  width: number;
  top: number;
  selected: boolean;
  onOpen: (eventId: string) => void;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>, mode: 'move' | 'resize') => void;
}

/**
 * One event on the timeline. The body drags to reposition; the right edge
 * drags to change duration.
 */
export const EventCard = memo(function EventCard({
  event,
  pov,
  left,
  width,
  top,
  selected,
  onOpen,
  onDragStart,
}: EventCardProps) {
  const accent = event.color ?? pov?.color ?? 'var(--color-accent)';

  return (
    <div
      className="absolute"
      style={{ left, top, width: Math.max(width, 84), height: EVENT_HEIGHT }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${event.title}. Press Enter to edit.`}
        onPointerDown={(pointerEvent) => onDragStart(pointerEvent, 'move')}
        onDoubleClick={() => onOpen(event.id)}
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault();
            onOpen(event.id);
          }
        }}
        className={cn(
          'group relative h-full cursor-grab touch-none overflow-hidden rounded-[var(--radius-control)] border px-2 py-1.5 text-left transition-shadow active:cursor-grabbing',
          selected
            ? 'border-[var(--color-accent)] shadow-[var(--shadow-float)]'
            : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
        )}
        style={{
          backgroundColor: withAlpha(
            accent.startsWith('#') ? accent : '#F5B942',
            selected ? 0.24 : 0.14,
          ),
          borderLeft: `3px solid ${accent}`,
        }}
      >
        <p className="truncate text-[0.78rem] leading-tight font-medium text-[var(--color-ink)]">
          {event.title}
        </p>
        {event.summary && (
          // Reserve the bottom-right corner so the cast counts never land on
          // top of the last line of the summary.
          <p className="mt-0.5 line-clamp-2 pr-8 text-[0.68rem] leading-snug text-[var(--color-ink-muted)]">
            {event.summary}
          </p>
        )}
        <div className="pointer-events-none absolute right-1 bottom-0.5 flex items-center gap-1.5 rounded bg-[var(--color-canvas)]/80 px-1 text-[0.62rem] text-[var(--color-ink-faint)] backdrop-blur-[2px]">
          {event.characterIds.length > 0 && (
            <span className="flex items-center gap-0.5">
              <Users size={9} aria-hidden="true" />
              {event.characterIds.length}
            </span>
          )}
          {event.locationIds.length > 0 && (
            <span className="flex items-center gap-0.5">
              <MapPin size={9} aria-hidden="true" />
              {event.locationIds.length}
            </span>
          )}
        </div>

        {/* Right-edge resize handle. */}
        <div
          role="separator"
          aria-label={`Adjust duration of ${event.title}`}
          onPointerDown={(pointerEvent) => {
            pointerEvent.stopPropagation();
            onDragStart(pointerEvent, 'resize');
          }}
          className="absolute top-0 right-0 h-full w-2 cursor-ew-resize touch-none opacity-0 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: withAlpha(accent.startsWith('#') ? accent : '#F5B942', 0.5) }}
        />
      </div>
    </div>
  );
});
