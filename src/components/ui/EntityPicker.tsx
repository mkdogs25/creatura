import { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Cpu, FileText, MapPin, PawPrint, Search, User, X } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { allDocs } from '@/store/selectors';
import type { AnyDoc, DocKind } from '@/types/domain';
import { fuzzyRank } from '@/utils/fuzzy';
import { cn } from '@/utils/cn';

const ICONS = { character: User, location: MapPin, creature: PawPrint, tech: Cpu, note: FileText };

interface EntityPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  kinds?: DocKind[];
  placeholder?: string;
  multiple?: boolean;
  label: string;
  /** Ids that cannot be chosen — e.g. the entity being edited. */
  exclude?: string[];
}

/**
 * Searchable picker over the project's canonical documents.
 *
 * Every place that needs to link to a character or location uses this, so
 * relationships, timeline events and map markers all reference the same
 * records rather than storing copies of names.
 */
export function EntityPicker({
  value,
  onChange,
  kinds,
  placeholder = 'Search…',
  multiple = true,
  label,
  exclude = [],
}: EntityPickerProps) {
  const bundle = useProjectStore((s) => s.bundle);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pool = useMemo(() => {
    const docs = allDocs(bundle).filter(
      (doc) => (!kinds || kinds.includes(doc.kind)) && !exclude.includes(doc.id),
    );
    if (!query) return docs.slice(0, 40);
    return fuzzyRank(query, docs, (doc) => doc.name, 20).map(({ item }) => item);
  }, [bundle, kinds, query, exclude]);

  const selected = useMemo(
    () =>
      value
        .map((id) => allDocs(bundle).find((doc) => doc.id === id))
        .filter((doc): doc is AnyDoc => Boolean(doc)),
    [value, bundle],
  );

  const missingCount = value.length - selected.length;

  const toggle = (id: string) => {
    if (multiple) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    } else {
      onChange(value[0] === id ? [] : [id]);
      setOpen(false);
    }
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex min-h-9 flex-wrap items-center gap-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-1.5 py-1"
        onClick={() => setOpen(true)}
      >
        {selected.map((doc) => {
          const Icon = ICONS[doc.kind];
          return (
            <span
              key={doc.id}
              className="inline-flex items-center gap-1 rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-[0.74rem] text-[var(--color-ink)]"
            >
              <Icon size={10} className="text-[var(--color-ink-faint)]" aria-hidden="true" />
              {doc.name}
              <button
                type="button"
                aria-label={`Remove ${doc.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(value.filter((v) => v !== doc.id));
                }}
                className="text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"
              >
                <X size={10} />
              </button>
            </span>
          );
        })}
        {missingCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-[0.72rem] italic text-[var(--color-ink-faint)]"
            title="The referenced entity has been deleted"
          >
            {missingCount} deleted
          </span>
        )}
        <input
          value={query}
          aria-label={label}
          placeholder={selected.length === 0 ? placeholder : ''}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && pool[0]) {
              event.preventDefault();
              toggle(pool[0].id);
            }
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'Backspace' && !query && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          className="min-w-[5rem] flex-1 bg-transparent px-1 py-0.5 text-[0.8rem] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
        />
        <ChevronDown size={13} className="mr-0.5 text-[var(--color-ink-faint)]" aria-hidden="true" />
      </div>

      {open && (
        <div className="scroll-thin absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] py-1 shadow-[var(--shadow-float)]">
          {pool.length === 0 ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-[0.76rem] text-[var(--color-ink-faint)]">
              <Search size={12} aria-hidden="true" />
              Nothing matches “{query}”.
            </p>
          ) : (
            pool.map((doc) => {
              const Icon = ICONS[doc.kind];
              const isSelected = value.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    toggle(doc.id);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.8rem] transition-colors hover:bg-[var(--color-surface-raised)]',
                    isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink)]',
                  )}
                >
                  <Icon size={12} className="shrink-0 opacity-60" aria-hidden="true" />
                  <span className="flex-1 truncate">{doc.name}</span>
                  {isSelected && <Check size={12} aria-hidden="true" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
