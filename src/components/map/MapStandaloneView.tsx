import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { docById } from '@/store/selectors';
import { MapBuilder } from '@/components/map/MapBuilder';
import { QuillMark } from '@/components/navigation/QuillMark';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * The whole browser tab, given over to one location's map — what "open in a
 * new tab" opens. This is a second, independent instance of the app reading
 * the same origin's IndexedDB, not a shared window: it boots, loads whatever
 * project is currently active on this device, and looks up the requested
 * doc in it. A different project active in this tab than in the one the link
 * was opened from is the one way this can come up empty.
 */
export function MapStandaloneView({ docId }: { docId: string }) {
  const bundle = useProjectStore((s) => s.bundle);
  const loading = useProjectStore((s) => s.loading);
  const doc = useMemo(() => docById(bundle, docId), [bundle, docId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[0.82rem] text-[var(--color-ink-faint)]">
        Opening the map…
      </div>
    );
  }

  if (!doc || doc.kind !== 'location') {
    return (
      <EmptyState
        icon={MapPin}
        title="Map not found."
        body="This tab's active project doesn't have that location. If it belongs to a different project, open that project first, then reopen the map from its location entry."
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-3">
        <span className="text-[var(--color-accent)]">
          <QuillMark size={16} />
        </span>
        <span className="type-label truncate">{doc.name} — Map</span>
      </header>
      <div className="min-h-0 flex-1">
        <MapBuilder mapId={doc.mapId} />
      </div>
    </div>
  );
}
