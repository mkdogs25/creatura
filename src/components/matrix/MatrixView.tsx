import { useCallback, useMemo, useRef, useState } from 'react';
import { Grid3x3, MapPin, Search, User, X } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { intersection } from '@/store/selectors';
import { useNavigation } from '@/hooks/useNavigation';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { TagEditor } from '@/components/metadata/TagEditor';
import { formatPosition } from '@/utils/time';
import { pluralize } from '@/utils/text';
import { withAlpha } from '@/utils/color';
import { cn } from '@/utils/cn';

const CELL_WIDTH = 132;
const CELL_HEIGHT = 44;
const ROW_HEADER_WIDTH = 190;
const COL_HEADER_HEIGHT = 132;
/** Extra rows/columns rendered beyond the viewport to hide scroll seams. */
const OVERSCAN = 4;

/**
 * Character × Location matrix.
 *
 * The grid is windowed — only the cells actually on screen are in the DOM — so
 * a project with hundreds of characters and locations still scrolls smoothly.
 * Every cell's contents are derived from live project data.
 */
export function MatrixView() {
  const bundle = useProjectStore((s) => s.bundle);
  const upsertCell = useProjectStore((s) => s.upsertCell);
  const createDoc = useProjectStore((s) => s.createDoc);
  const { openEntity, openEvent } = useNavigation();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ characterId: string; locationId: string } | null>(
    null,
  );
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 900, height: 600 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const characters = useMemo(() => {
    const list = [...(bundle?.characters ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return list;
    return list.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  }, [bundle?.characters, query]);

  const locations = useMemo(() => {
    const list = [...(bundle?.locations ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return list;
    return list.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()));
  }, [bundle?.locations, query]);

  const measure = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    if (node) {
      setViewportSize({ width: node.clientWidth, height: node.clientHeight });
    }
  }, []);

  const firstCol = Math.max(0, Math.floor(scroll.left / CELL_WIDTH) - OVERSCAN);
  const lastCol = Math.min(
    characters.length,
    Math.ceil((scroll.left + viewportSize.width) / CELL_WIDTH) + OVERSCAN,
  );
  const firstRow = Math.max(0, Math.floor(scroll.top / CELL_HEIGHT) - OVERSCAN);
  const lastRow = Math.min(
    locations.length,
    Math.ceil((scroll.top + viewportSize.height) / CELL_HEIGHT) + OVERSCAN,
  );

  const visibleCharacters = characters.slice(firstCol, lastCol);
  const visibleLocations = locations.slice(firstRow, lastRow);

  const detail = useMemo(
    () => (selected ? intersection(bundle, selected.characterId, selected.locationId) : null),
    [bundle, selected],
  );

  if (!bundle) return null;

  if (bundle.characters.length === 0 || bundle.locations.length === 0) {
    return (
      <EmptyState
        icon={Grid3x3}
        title="Connect your characters to places."
        body="The matrix shows every character against every location, so you can see at a glance who has been where — and who has never met the place they are supposed to be from. It needs at least one of each to draw."
      >
        {bundle.characters.length === 0 && (
          <Button variant="primary" onClick={() => createDoc({ kind: 'character' })}>
            <User size={14} />
            Create a character
          </Button>
        )}
        {bundle.locations.length === 0 && (
          <Button
            variant={bundle.characters.length === 0 ? 'secondary' : 'primary'}
            onClick={() => createDoc({ kind: 'location' })}
          >
            <MapPin size={14} />
            Create a location
          </Button>
        )}
      </EmptyState>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] px-3 py-2">
          <h2 className="type-display mr-1 text-[1.05rem] text-[var(--color-ink)]">Matrix</h2>
          <p className="text-[0.72rem] text-[var(--color-ink-faint)]">
            {characters.length} characters × {locations.length} locations
          </p>
          <div className="ml-auto flex items-center gap-1.5">
            <Search size={13} className="text-[var(--color-ink-faint)]" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter rows and columns…"
              aria-label="Filter the matrix"
              className="w-52 text-[0.78rem]"
            />
          </div>
        </header>

        {characters.length === 0 || locations.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches found."
            body={`Nothing in this project matches “${query}”. Try a shorter query, or clear the filter.`}
            compact
          >
            <Button variant="secondary" onClick={() => setQuery('')}>
              Clear filter
            </Button>
          </EmptyState>
        ) : (
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {/* Column headers — characters */}
            <div
              className="absolute top-0 left-0 z-20 border-r border-b border-[var(--color-line)] bg-[var(--color-surface)]"
              style={{ width: ROW_HEADER_WIDTH, height: COL_HEADER_HEIGHT }}
            >
              <span className="type-label absolute bottom-2 left-3">Locations ↓</span>
              <span className="type-label absolute top-2 right-3">Characters →</span>
            </div>

            <div
              className="absolute top-0 z-10 overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-surface)]"
              style={{
                left: ROW_HEADER_WIDTH,
                right: 0,
                height: COL_HEADER_HEIGHT,
              }}
            >
              <div
                className="relative h-full"
                style={{
                  width: characters.length * CELL_WIDTH,
                  transform: `translateX(${-scroll.left}px)`,
                }}
              >
                {visibleCharacters.map((character, index) => (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => openEntity(character.id)}
                    title={character.name}
                    className="absolute bottom-0 flex h-full items-end justify-start border-l border-[var(--color-line)] px-2 pb-2 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
                    style={{ left: (firstCol + index) * CELL_WIDTH, width: CELL_WIDTH }}
                  >
                    <span
                      className="max-h-[7rem] origin-bottom-left translate-y-[-2px] rotate-[-58deg] truncate text-[0.76rem] whitespace-nowrap text-[var(--color-ink)]"
                      style={{ maxWidth: '9rem' }}
                    >
                      {character.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Row headers — locations */}
            <div
              className="absolute bottom-0 left-0 z-10 overflow-hidden border-r border-[var(--color-line)] bg-[var(--color-surface)]"
              style={{ top: COL_HEADER_HEIGHT, width: ROW_HEADER_WIDTH }}
            >
              <div
                className="relative"
                style={{
                  height: locations.length * CELL_HEIGHT,
                  transform: `translateY(${-scroll.top}px)`,
                }}
              >
                {visibleLocations.map((location, index) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => openEntity(location.id)}
                    className="absolute flex w-full items-center border-b border-[var(--color-line)] px-3 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
                    style={{ top: (firstRow + index) * CELL_HEIGHT, height: CELL_HEIGHT }}
                  >
                    <span className="truncate text-[0.78rem] text-[var(--color-ink)]">
                      {location.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cells */}
            <div
              ref={measure}
              className="scroll-thin absolute overflow-auto"
              style={{
                top: COL_HEADER_HEIGHT,
                left: ROW_HEADER_WIDTH,
                right: 0,
                bottom: 0,
              }}
              onScroll={(event) =>
                setScroll({
                  top: event.currentTarget.scrollTop,
                  left: event.currentTarget.scrollLeft,
                })
              }
            >
              <div
                className="relative"
                style={{
                  width: characters.length * CELL_WIDTH,
                  height: locations.length * CELL_HEIGHT,
                }}
              >
                {visibleLocations.map((location, rowIndex) =>
                  visibleCharacters.map((character, colIndex) => {
                    const data = intersection(bundle, character.id, location.id);
                    const isSelected =
                      selected?.characterId === character.id &&
                      selected?.locationId === location.id;
                    // Prefer what the author wrote; otherwise describe the
                    // strongest derived signal for this pairing.
                    const label =
                      data.cell?.status ||
                      (data.events.length > 0
                        ? pluralize(data.events.length, 'event')
                        : (data.relationships[0]?.type ?? ''));
                    return (
                      <button
                        key={`${character.id}:${location.id}`}
                        type="button"
                        onClick={() =>
                          setSelected({ characterId: character.id, locationId: location.id })
                        }
                        aria-label={`${character.name} at ${location.name}${
                          data.weight > 0 ? `, ${data.events.length} events` : ', no connection'
                        }`}
                        className={cn(
                          'absolute flex items-center overflow-hidden border-r border-b border-[var(--color-line)] px-2 text-left transition-colors',
                          isSelected
                            ? 'ring-2 ring-[var(--color-accent)] ring-inset'
                            : 'hover:bg-[var(--color-surface-raised)]',
                        )}
                        style={{
                          left: (firstCol + colIndex) * CELL_WIDTH,
                          top: (firstRow + rowIndex) * CELL_HEIGHT,
                          width: CELL_WIDTH,
                          height: CELL_HEIGHT,
                          backgroundColor:
                            data.weight > 0
                              ? withAlpha('#F5B942', Math.min(0.06 + data.weight * 0.05, 0.28))
                              : undefined,
                        }}
                      >
                        {data.weight > 0 && (
                          <span
                            className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate text-[0.7rem] text-[var(--color-ink-muted)]">
                          {label}
                        </span>
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {detail && selected && (
        <aside
          aria-label="Intersection details"
          className="w-[20rem] shrink-0 overflow-y-auto border-l border-[var(--color-line)] bg-[var(--color-surface)] animate-slide-right scroll-thin"
        >
          <header className="flex items-start justify-between gap-2 border-b border-[var(--color-line)] px-4 py-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => openEntity(selected.characterId)}
                className="block truncate text-[0.92rem] font-semibold text-[var(--color-ink)] hover:text-[var(--color-accent)]"
              >
                {bundle.characters.find((c) => c.id === selected.characterId)?.name}
              </button>
              <button
                type="button"
                onClick={() => openEntity(selected.locationId)}
                className="block truncate text-[0.78rem] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
              >
                × {bundle.locations.find((l) => l.id === selected.locationId)?.name}
              </button>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Close details" onClick={() => setSelected(null)}>
              <X size={14} />
            </Button>
          </header>

          <section className="border-b border-[var(--color-line)] px-4 py-3">
            <h3 className="type-label mb-1.5">Status</h3>
            <Input
              value={detail.cell?.status ?? ''}
              placeholder="Resident, Exile, Never been…"
              aria-label="Relationship status"
              onChange={(event) =>
                upsertCell(selected.characterId, selected.locationId, {
                  status: event.target.value,
                })
              }
            />
          </section>

          <section className="border-b border-[var(--color-line)] px-4 py-3">
            <h3 className="type-label mb-1.5">Relationship</h3>
            {detail.relationships.length === 0 ? (
              <p className="text-[0.76rem] text-[var(--color-ink-faint)]">
                No direct link recorded. Add one from either entry's details panel.
              </p>
            ) : (
              <ul className="space-y-1">
                {detail.relationships.map((relationship) => (
                  <li key={relationship.id} className="text-[0.78rem] text-[var(--color-ink-muted)]">
                    {relationship.type}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-b border-[var(--color-line)] px-4 py-3">
            <h3 className="type-label mb-1.5">
              Events {detail.events.length > 0 && `(${detail.events.length})`}
            </h3>
            {detail.events.length === 0 ? (
              <p className="text-[0.76rem] text-[var(--color-ink-faint)]">
                They have never shared a scene here.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {detail.events.map((event, index) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => openEvent(event.id)}
                      className="w-full rounded px-1 py-1 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
                    >
                      <span className="block truncate text-[0.78rem] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]">
                        • {event.title}
                      </span>
                      <span className="block text-[0.66rem] text-[var(--color-ink-faint)]">
                        {index === 0 ? 'First appearance · ' : ''}
                        {event.dateLabel || formatPosition(event.start, bundle.project)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-b border-[var(--color-line)] px-4 py-3">
            <h3 className="type-label mb-1.5">Tags</h3>
            <TagEditor
              tagIds={detail.cell?.tagIds ?? []}
              onChange={(tagIds) =>
                upsertCell(selected.characterId, selected.locationId, { tagIds })
              }
            />
          </section>

          <section className="px-4 py-3">
            <h3 className="type-label mb-1.5">Notes</h3>
            <Textarea
              rows={5}
              value={detail.cell?.note ?? ''}
              aria-label="Intersection notes"
              placeholder="What does this place mean to them?"
              onChange={(event) =>
                upsertCell(selected.characterId, selected.locationId, {
                  note: event.target.value,
                })
              }
            />
          </section>
        </aside>
      )}
    </div>
  );
}
