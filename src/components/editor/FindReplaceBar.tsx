import { useEffect, useRef } from 'react';
import { CaseSensitive, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useFindReplace } from '@/hooks/useFindReplace';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';

/**
 * A find/replace bar docked over the top-right of the writing surface —
 * opened by ⌘F or the toolbar, closed by Escape or its own close button.
 * Reads whichever editor is currently registered in the store, so the same
 * component works unmodified in both World Library and the Manuscript view.
 */
export function FindReplaceBar() {
  const open = useEditorStore((s) => s.findReplaceOpen);
  const setOpen = useEditorStore((s) => s.setFindReplaceOpen);
  const editor = useEditorStore((s) => s.editor);
  const {
    query,
    setQuery,
    replacement,
    setReplacement,
    caseSensitive,
    toggleCaseSensitive,
    matches,
    activeIndex,
    next,
    prev,
    replaceCurrent,
    replaceAll,
  } = useFindReplace(open ? editor : null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const count = matches.length;
  const status = query ? (count > 0 ? `${activeIndex + 1} of ${count}` : 'No results') : '';

  return (
    <div className="absolute top-2 right-2 z-30 w-[22rem] max-w-[calc(100%-1rem)] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] shadow-[var(--shadow-float)] animate-rise">
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find"
          aria-label="Find"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (event.shiftKey) prev();
              else next();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              editor?.commands.focus();
            }
          }}
          className="min-w-0 flex-1 rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-2 py-1 text-[0.8rem] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
        />
        <Tooltip label="Match case">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Match case"
            aria-pressed={caseSensitive}
            onClick={toggleCaseSensitive}
            className={cn(caseSensitive && 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]')}
          >
            <CaseSensitive size={15} />
          </Button>
        </Tooltip>
        <span className="w-16 shrink-0 text-center font-mono text-[0.68rem] text-[var(--color-ink-faint)] tabular-nums">
          {status}
        </span>
        <Tooltip label="Previous match · ⇧⏎">
          <Button variant="ghost" size="icon-sm" aria-label="Previous match" onClick={prev} disabled={count === 0}>
            <ChevronUp size={14} />
          </Button>
        </Tooltip>
        <Tooltip label="Next match · ⏎">
          <Button variant="ghost" size="icon-sm" aria-label="Next match" onClick={next} disabled={count === 0}>
            <ChevronDown size={14} />
          </Button>
        </Tooltip>
        <Tooltip label="Close · Esc">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close find and replace"
            onClick={() => {
              setOpen(false);
              editor?.commands.focus();
            }}
          >
            <X size={14} />
          </Button>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1.5 border-t border-[var(--color-line)] px-2.5 py-2">
        <input
          value={replacement}
          onChange={(event) => setReplacement(event.target.value)}
          placeholder="Replace"
          aria-label="Replace with"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              replaceCurrent();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              editor?.commands.focus();
            }
          }}
          className="min-w-0 flex-1 rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-2 py-1 text-[0.8rem] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
        />
        <Button variant="secondary" size="sm" onClick={replaceCurrent} disabled={count === 0}>
          Replace
        </Button>
        <Button variant="secondary" size="sm" onClick={replaceAll} disabled={count === 0}>
          Replace all
        </Button>
      </div>
    </div>
  );
}
