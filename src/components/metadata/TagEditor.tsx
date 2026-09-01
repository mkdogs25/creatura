import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { withAlpha } from '@/utils/color';
import { fuzzyRank } from '@/utils/fuzzy';

interface TagEditorProps {
  tagIds: string[];
  onChange: (tagIds: string[]) => void;
}

/** Tag chips with search-or-create. Tags are project-wide canonical records. */
export function TagEditor({ tagIds, onChange }: TagEditorProps) {
  const tags = useProjectStore((s) => s.bundle?.tags ?? []);
  const createTag = useProjectStore((s) => s.createTag);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const applied = useMemo(
    () => tagIds.map((id) => tags.find((tag) => tag.id === id)).filter(Boolean),
    [tagIds, tags],
  );

  const suggestions = useMemo(() => {
    const available = tags.filter((tag) => !tagIds.includes(tag.id));
    if (!query) return available.slice(0, 8);
    return fuzzyRank(query, available, (tag) => tag.name, 8).map(({ item }) => item);
  }, [tags, tagIds, query]);

  const commit = (name: string) => {
    const clean = name.trim().replace(/^#/, '');
    if (!clean) return;
    const id = createTag(clean);
    if (id && !tagIds.includes(id)) onChange([...tagIds, id]);
    setQuery('');
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {applied.map(
        (tag) =>
          tag && (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-medium"
              style={{ backgroundColor: withAlpha(tag.color, 0.18), color: tag.color }}
            >
              #{tag.name}
              <button
                type="button"
                aria-label={`Remove tag ${tag.name}`}
                onClick={() => onChange(tagIds.filter((id) => id !== tag.id))}
                className="opacity-60 transition-opacity hover:opacity-100"
              >
                <X size={10} />
              </button>
            </span>
          ),
      )}

      {adding ? (
        <div className="relative">
          <input
            autoFocus
            value={query}
            placeholder="Tag name…"
            aria-label="Add a tag"
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => window.setTimeout(() => setAdding(false), 140)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit(suggestions[0] && !query ? suggestions[0].name : query);
              } else if (event.key === 'Escape') {
                setAdding(false);
                setQuery('');
              }
            }}
            className="w-28 rounded-full border border-[var(--color-accent)] bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[0.72rem] outline-none"
          />
          {(suggestions.length > 0 || query) && (
            <div className="absolute z-50 mt-1 w-44 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] py-1 shadow-[var(--shadow-float)]">
              {suggestions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange([...tagIds, tag.id]);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1 text-left text-[0.75rem] hover:bg-[var(--color-surface-raised)]"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden="true"
                  />
                  #{tag.name}
                </button>
              ))}
              {query && !tags.some((t) => t.name.toLowerCase() === query.toLowerCase()) && (
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(query);
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1 text-left text-[0.75rem] text-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]"
                >
                  <Plus size={11} aria-hidden="true" />
                  Create #{query}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-line-strong)] px-2 py-0.5 text-[0.72rem] text-[var(--color-ink-faint)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Plus size={10} aria-hidden="true" />
          Tag
        </button>
      )}
    </div>
  );
}
