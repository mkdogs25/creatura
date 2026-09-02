import { useMemo, useState } from 'react';
import { MapPin, User, X } from 'lucide-react';
import { detectNameCandidates } from '@/features/mentions/entitySuggestions';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import type { RichContent } from '@/types/domain';

interface EntitySuggestionsProps {
  content: RichContent;
  knownNames: string[];
  onCreate: (kind: 'character' | 'location', name: string) => void;
}

/**
 * Names that keep showing up in the prose but aren't a character or location
 * yet — a nudge, not an assertion. Mount this with `key={doc.id}` (or the
 * chapter's id) so dismissals don't leak from one document into the next.
 */
export function EntitySuggestions({ content, knownNames, onCreate }: EntitySuggestionsProps) {
  const knownSet = useMemo(() => new Set(knownNames.map((name) => name.toLowerCase())), [knownNames]);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const candidates = useMemo(
    () =>
      detectNameCandidates(content, knownSet).filter(
        (candidate) => !dismissed.has(candidate.name.toLowerCase()),
      ),
    [content, knownSet, dismissed],
  );

  if (candidates.length === 0) {
    return (
      <p className="text-[0.76rem] leading-relaxed text-[var(--color-ink-faint)]">
        Names mentioned several times without an entity yet will show up here.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {candidates.map((candidate) => (
        <li
          key={candidate.name}
          className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-2.5 py-1.5"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.8rem] text-[var(--color-ink)]">
              {candidate.name}
            </span>
            <span className="block text-[0.68rem] text-[var(--color-ink-faint)]">
              Mentioned {candidate.count} times
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip label={`Create “${candidate.name}” as a character`}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Create ${candidate.name} as a character`}
                onClick={() => onCreate('character', candidate.name)}
              >
                <User size={13} />
              </Button>
            </Tooltip>
            <Tooltip label={`Create “${candidate.name}” as a location`}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Create ${candidate.name} as a location`}
                onClick={() => onCreate('location', candidate.name)}
              >
                <MapPin size={13} />
              </Button>
            </Tooltip>
            <Tooltip label="Dismiss">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Dismiss suggestion for ${candidate.name}`}
                onClick={() =>
                  setDismissed((prev) => new Set(prev).add(candidate.name.toLowerCase()))
                }
              >
                <X size={13} />
              </Button>
            </Tooltip>
          </div>
        </li>
      ))}
    </ul>
  );
}
