import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cpu, FileText, MapPin, PawPrint, User } from 'lucide-react';
import { useMentionStore } from '@/editor/extensions/mentionState';
import { cn } from '@/utils/cn';

const ICONS = {
  character: User,
  location: MapPin,
  creature: PawPrint,
  tech: Cpu,
  note: FileText,
};

/**
 * The `@` autocomplete popup. It renders in a portal and positions itself
 * against the caret rectangle reported by the suggestion plugin.
 */
export function MentionMenu() {
  const { open, items, index, rect, select, hide, setIndex, query } = useMentionStore();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });

  useLayoutEffect(() => {
    if (!open || !rect || !ref.current) return;
    const menu = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < menu.height + 16 ? rect.top - menu.height - 6 : rect.bottom + 6;
    const left = Math.min(rect.left, window.innerWidth - menu.width - 12);
    setPosition({ top: Math.max(8, top), left: Math.max(8, left) });
  }, [open, rect, items.length]);

  if (!open) return null;

  return createPortal(
    <div
      ref={ref}
      role="listbox"
      aria-label="Insert a reference"
      style={{ top: position.top, left: position.left }}
      className="fixed z-[180] w-[19rem] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] py-1 shadow-[var(--shadow-float)] animate-rise"
    >
      {items.length === 0 ? (
        <p className="px-3 py-3 text-[0.78rem] text-[var(--color-ink-faint)]">
          {query ? `Nothing named “${query}” yet.` : 'No entities in this project yet.'}
        </p>
      ) : (
        items.map((candidate, i) => {
          const Icon = ICONS[candidate.doc.kind];
          return (
            <button
              key={candidate.doc.id}
              type="button"
              role="option"
              aria-selected={i === index}
              onMouseEnter={() => setIndex(i)}
              onMouseDown={(event) => {
                // Mouse-down, not click: clicking would blur the editor first
                // and collapse the suggestion range before we could use it.
                event.preventDefault();
                select?.(candidate);
                hide();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                i === index && 'bg-[var(--color-surface-raised)]',
              )}
            >
              <Icon
                size={14}
                className="shrink-0 text-[var(--color-ink-faint)]"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.83rem] text-[var(--color-ink)]">
                  {candidate.doc.name}
                </span>
                <span className="block truncate text-[0.7rem] text-[var(--color-ink-faint)]">
                  {candidate.context}
                </span>
              </span>
            </button>
          );
        })
      )}
    </div>,
    document.body,
  );
}
