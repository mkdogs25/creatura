import { useId, useState } from 'react';
import { ChevronRight, UserRound } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import type { CharacterDoc, CharacterProfile } from '@/types/domain';

const TITLE_SUGGESTIONS = ['Mr', 'Mrs', 'Ms', 'Mx', 'Dr', 'Professor', 'Captain', 'Sir', 'Lady', 'Lord'];
const ROLE_SUGGESTIONS = [
  'Protagonist',
  'Antagonist',
  'Deuteragonist',
  'Sidekick',
  'Mentor',
  'Love Interest',
  'Supporting',
  'Minor',
];

/**
 * A structured profile, filled in right beside the prose rather than buried
 * in generic metadata — the point isn't just convenience, it's that the app
 * can finally tell "Professor Oshira" and "Professor Bristol Oshira" are the
 * same person once it knows the title and the name are in parts (see
 * `expandKnownNames`). Role and Personality Traits also become tags as
 * they're typed, so filling this in tags the character for free.
 */
export function ProfileFields({ doc }: { doc: CharacterDoc }) {
  const updateCharacterProfile = useProjectStore((s) => s.updateCharacterProfile);
  const [expanded, setExpanded] = useState(() => hasAnyValue(doc.profile));
  const titleListId = useId();
  const roleListId = useId();

  const set = (patch: Partial<CharacterProfile>) => updateCharacterProfile(doc.id, patch);
  const p = doc.profile;

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
        <UserRound size={12} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
        <span className="type-label">Character Profile</span>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-2.5 pb-3.5 sm:grid-cols-4">
          <Field label="Title">
            <Input
              list={titleListId}
              value={p.title}
              placeholder="—"
              aria-label="Title"
              onChange={(e) => set({ title: e.target.value })}
            />
            <datalist id={titleListId}>
              {TITLE_SUGGESTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field label="First name">
            <Input value={p.firstName} onChange={(e) => set({ firstName: e.target.value })} />
          </Field>
          <Field label="Middle name">
            <Input value={p.middleName} onChange={(e) => set({ middleName: e.target.value })} />
          </Field>
          <Field label="Last name">
            <Input value={p.lastName} onChange={(e) => set({ lastName: e.target.value })} />
          </Field>

          <Field label="Role">
            <Input
              list={roleListId}
              value={p.role}
              placeholder="—"
              aria-label="Role"
              onChange={(e) => set({ role: e.target.value })}
            />
            <datalist id={roleListId}>
              {ROLE_SUGGESTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field label="Age">
            <Input value={p.age} onChange={(e) => set({ age: e.target.value })} />
          </Field>
          <Field label="Gender">
            <Input value={p.gender} onChange={(e) => set({ gender: e.target.value })} />
          </Field>
          <Field label="Occupation">
            <Input value={p.occupation} onChange={(e) => set({ occupation: e.target.value })} />
          </Field>

          <div className="col-span-2 sm:col-span-4">
            <Field label="Physical features" hint="Eye colour, hair, height — whatever matters for this one.">
              <Textarea
                rows={2}
                value={p.physicalFeatures}
                onChange={(e) => set({ physicalFeatures: e.target.value })}
              />
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <Field label="Personality traits" hint="Comma- or line-separated — each one becomes a tag.">
              <Textarea
                rows={2}
                value={p.personalityTraits}
                onChange={(e) => set({ personalityTraits: e.target.value })}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function hasAnyValue(profile: CharacterProfile): boolean {
  return Object.values(profile).some((value) => value.trim().length > 0);
}
