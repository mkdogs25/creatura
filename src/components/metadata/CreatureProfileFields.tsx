import { useId } from 'react';
import { PawPrint } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { ProfileSection } from '@/components/metadata/ProfileSection';
import { Field, Input, Textarea } from '@/components/ui/Input';
import type { CreatureDoc, CreatureProfile } from '@/types/domain';

const SPECIES_SUGGESTIONS = ['Beast', 'Monster', 'Familiar', 'Spirit', 'Undead', 'Construct', 'Hybrid', 'Divine'];

function hasAnyValue(profile: CreatureProfile): boolean {
  return Object.values(profile).some((value) => value.trim().length > 0);
}

/** Structured creature profile — Species doubles as a tag, Abilities double
 * as several, the same pattern as the character and location profiles. */
export function CreatureProfileFields({ doc }: { doc: CreatureDoc }) {
  const updateEntityProfile = useProjectStore((s) => s.updateEntityProfile);
  const speciesListId = useId();
  const set = (patch: Partial<CreatureProfile>) => updateEntityProfile(doc.id, patch);
  const p = doc.profile;

  return (
    <ProfileSection icon={PawPrint} title="Creature Profile" defaultExpanded={hasAnyValue(p)}>
      <Field label="Species">
        <Input
          list={speciesListId}
          value={p.species}
          placeholder="—"
          aria-label="Species"
          onChange={(e) => set({ species: e.target.value })}
        />
        <datalist id={speciesListId}>
          {SPECIES_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </Field>
      <Field label="Habitat">
        <Input value={p.habitat} onChange={(e) => set({ habitat: e.target.value })} />
      </Field>
      <Field label="Diet">
        <Input value={p.diet} onChange={(e) => set({ diet: e.target.value })} />
      </Field>
      <Field label="Size">
        <Input value={p.size} onChange={(e) => set({ size: e.target.value })} />
      </Field>
      <Field label="Threat level">
        <Input value={p.threatLevel} onChange={(e) => set({ threatLevel: e.target.value })} />
      </Field>

      <div className="col-span-2 sm:col-span-4">
        <Field label="Abilities" hint="Comma- or line-separated — each one becomes a tag.">
          <Textarea rows={2} value={p.abilities} onChange={(e) => set({ abilities: e.target.value })} />
        </Field>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <Field label="Physical features" hint="Size, colouring, distinguishing marks.">
          <Textarea rows={2} value={p.physicalFeatures} onChange={(e) => set({ physicalFeatures: e.target.value })} />
        </Field>
      </div>
    </ProfileSection>
  );
}
