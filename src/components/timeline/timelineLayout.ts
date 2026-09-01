import type { TimelineEvent, TimelineSection } from '@/types/domain';

export const LANE_HEIGHT = 92;
export const EVENT_HEIGHT = 62;
export const ROW_GAP = 6;
export const HEADER_HEIGHT = 34;
export const SECTION_ROW_HEIGHT = 22;
export const GUTTER_WIDTH = 148;

/**
 * Assigns each event a row inside its lane so overlapping events stack rather
 * than covering one another. This is what makes two scenes happening at the
 * same moment visible as a conflict instead of a single card.
 */
export function assignRows(events: TimelineEvent[]): Map<string, number> {
  const rows = new Map<string, number>();
  const rowEnds: number[] = [];
  const ordered = [...events].sort((a, b) => a.start - b.start || a.duration - b.duration);

  for (const event of ordered) {
    const end = event.start + Math.max(event.duration, 0.5);
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= event.start);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(end);
    } else {
      rowEnds[row] = end;
    }
    rows.set(event.id, row);
  }
  return rows;
}

/** Tallest row index used in a lane, so lane heights can grow to fit. */
export function laneRowCount(events: TimelineEvent[], rows: Map<string, number>): number {
  let max = 0;
  for (const event of events) max = Math.max(max, (rows.get(event.id) ?? 0) + 1);
  return Math.max(1, max);
}

export interface TimelineBounds {
  min: number;
  max: number;
}

/** The span the axis needs to cover, with a little breathing room at each end. */
export function timelineBounds(
  events: TimelineEvent[],
  sections: TimelineSection[],
): TimelineBounds {
  let min = Infinity;
  let max = -Infinity;
  for (const event of events) {
    min = Math.min(min, event.start);
    max = Math.max(max, event.start + event.duration);
  }
  for (const section of sections) {
    min = Math.min(min, section.start);
    max = Math.max(max, section.end);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 20 };
  const pad = Math.max(2, (max - min) * 0.08);
  return { min: Math.floor(min - pad), max: Math.ceil(max + pad) };
}
