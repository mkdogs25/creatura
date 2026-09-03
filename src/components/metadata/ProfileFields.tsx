import { useId } from 'react';
import { UserRound } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { Field, Input, Textarea } from '@/components/ui/Input';
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
 * A structured profile — the character doc's entire editing surface, not a
 * strip above the prose. The point isn't just convenience, it's that the app
 * can finally tell "Professor Oshira" and "Professor Bristol Oshira" are the
 * same person once it knows the title and the name are in parts (see
 * `expandKnownNames`). Role and Personality Traits also become tags as
 * they're typed, so filling this in tags the character for free.
 */
export function ProfileFields({ doc }: { doc: CharacterDoc }) {
  const updateCharacterProfile = useProjectStore((s) => s.updateCharacterProfile);
  const titleListId = useId();
  const roleListId = useId();

  const set = (patch: Partial<CharacterProfile>) => updateCharacterProfile(doc.id, patch);
  const p = doc.profile;

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-10 sm:px-6">
      <div className="mb-3 flex items-center gap-1.5 text-[var(--color-ink-faint)]">
        <UserRound size={12} className="shrink-0" aria-hidden="true" />
        <span className="type-label">Character Profile</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              rows={4}
              value={p.physicalFeatures}
              onChange={(e) => set({ physicalFeatures: e.target.value })}
            />
          </Field>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <Field label="Personality traits" hint="Comma- or line-separated — each one becomes a tag.">
            <Textarea
              rows={4}
              value={p.personalityTraits}
              onChange={(e) => set({ personalityTraits: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
