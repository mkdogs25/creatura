import type { Project } from '@/types/domain';

/**
 * The timeline runs on an abstract integer axis rather than real dates, so a
 * story can be plotted in chapters, days or years without the author having to
 * invent a calendar. `timelineUnit` decides only how a position is *labelled*.
 */
export const UNIT_LABEL: Record<Project['timelineUnit'], string> = {
  chapter: 'Chapter',
  day: 'Day',
  year: 'Year',
};

export function formatPosition(position: number, project: Project | null): string {
  const unit = project?.timelineUnit ?? 'chapter';
  const origin = project?.timelineOrigin ?? 0;
  const value = Math.round(origin + position);
  if (unit === 'year') return `Year ${value}`;
  if (unit === 'day') return `Day ${value}`;
  return `Chapter ${value}`;
}

export function formatDuration(duration: number, project: Project | null): string {
  const unit = project?.timelineUnit ?? 'chapter';
  const rounded = Math.round(duration * 10) / 10;
  if (rounded <= 0) return 'Instant';
  const noun = unit === 'year' ? 'year' : unit === 'day' ? 'day' : 'chapter';
  return `${rounded} ${rounded === 1 ? noun : `${noun}s`}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Snaps to whole units at low zoom and to halves once the axis is wide enough. */
export function snapPosition(position: number, pixelsPerUnit: number): number {
  const step = pixelsPerUnit > 90 ? 0.25 : pixelsPerUnit > 40 ? 0.5 : 1;
  return Math.round(position / step) * step;
}

/** Chooses a gridline interval that keeps ticks at least ~72px apart. */
export function tickInterval(pixelsPerUnit: number): number {
  const candidates = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];
  for (const candidate of candidates) {
    if (candidate * pixelsPerUnit >= 72) return candidate;
  }
  return candidates[candidates.length - 1];
}
