import { useState } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProfileSectionProps {
  icon: LucideIcon;
  title: string;
  defaultExpanded: boolean;
  children: React.ReactNode;
}

/**
 * The collapsible "structured profile" strip shared by Location, Creature and
 * Tech docs — filled in beside the prose, the same idea as the Character
 * profile, so a doc's category and defining traits become tags without
 * leaving the note. (Character's own version is standalone rather than
 * collapsible, since it replaces the prose editor outright.)
 */
export function ProfileSection({ icon: Icon, title, defaultExpanded, children }: ProfileSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="shrink-0 border-b border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-4 sm:px-6">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-1.5 py-2.5 text-left"
      >
        <ChevronRight
          size={12}
          className={cn('shrink-0 text-[var(--color-ink-faint)] transition-transform duration-200', expanded && 'rotate-90')}
        />
        <Icon size={12} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden={true} />
        <span className="type-label">{title}</span>
      </button>

      {expanded && <div className="grid grid-cols-2 gap-2.5 pb-3.5 sm:grid-cols-4">{children}</div>}
    </div>
  );
}
