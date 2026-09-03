import { useId } from 'react';
import { Cpu } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { ProfileSection } from '@/components/metadata/ProfileSection';
import { Field, Input, Textarea } from '@/components/ui/Input';
import type { TechDoc, TechProfile } from '@/types/domain';

const CATEGORY_SUGGESTIONS = ['Weapon', 'Vehicle', 'Device', 'Magic Item', 'Artifact', 'Armor', 'Tool', 'Structure'];

function hasAnyValue(profile: TechProfile): boolean {
  return Object.values(profile).some((value) => value.trim().length > 0);
}

/** Structured tech/artifact profile — Category doubles as a tag, Properties
 * double as several, the same pattern as the other structured profiles. */
export function TechProfileFields({ doc }: { doc: TechDoc }) {
  const updateEntityProfile = useProjectStore((s) => s.updateEntityProfile);
  const categoryListId = useId();
  const set = (patch: Partial<TechProfile>) => updateEntityProfile(doc.id, patch);
  const p = doc.profile;

  return (
    <ProfileSection icon={Cpu} title="Tech Profile" defaultExpanded={hasAnyValue(p)}>
      <Field label="Category">
        <Input
          list={categoryListId}
          value={p.category}
          placeholder="—"
          aria-label="Category"
          onChange={(e) => set({ category: e.target.value })}
        />
        <datalist id={categoryListId}>
          {CATEGORY_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </Field>
      <Field label="Origin">
        <Input value={p.origin} onChange={(e) => set({ origin: e.target.value })} />
      </Field>
      <Field label="Rarity">
        <Input value={p.rarity} onChange={(e) => set({ rarity: e.target.value })} />
      </Field>
      <Field label="Power source">
        <Input value={p.powerSource} onChange={(e) => set({ powerSource: e.target.value })} />
      </Field>

      <div className="col-span-2 sm:col-span-4">
        <Field label="Function" hint="What it does.">
          <Textarea rows={2} value={p.function} onChange={(e) => set({ function: e.target.value })} />
        </Field>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <Field label="Properties" hint="Comma- or line-separated — each one becomes a tag.">
          <Textarea rows={2} value={p.properties} onChange={(e) => set({ properties: e.target.value })} />
        </Field>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <Field label="Limitations" hint="Drawbacks, costs, what it can't do.">
          <Textarea rows={2} value={p.limitations} onChange={(e) => set({ limitations: e.target.value })} />
        </Field>
      </div>
    </ProfileSection>
  );
}
