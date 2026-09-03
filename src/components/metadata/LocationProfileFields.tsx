import { useId } from 'react';
import { MapPin } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { ProfileSection } from '@/components/metadata/ProfileSection';
import { Field, Input, Textarea } from '@/components/ui/Input';
import type { LocationDoc, LocationProfile } from '@/types/domain';

const TYPE_SUGGESTIONS = ['City', 'Town', 'Village', 'Region', 'Country', 'Building', 'Landmark', 'Wilderness', 'Realm'];

function hasAnyValue(profile: LocationProfile): boolean {
  return Object.values(profile).some((value) => value.trim().length > 0);
}

/** Structured location profile — mirrors the character profile pattern:
 * Type doubles as a tag, Notable Features double as several. */
export function LocationProfileFields({ doc }: { doc: LocationDoc }) {
  const updateEntityProfile = useProjectStore((s) => s.updateEntityProfile);
  const typeListId = useId();
  const set = (patch: Partial<LocationProfile>) => updateEntityProfile(doc.id, patch);
  const p = doc.profile;

  return (
    <ProfileSection icon={MapPin} title="Location Profile" defaultExpanded={hasAnyValue(p)}>
      <Field label="Type">
        <Input
          list={typeListId}
          value={p.type}
          placeholder="—"
          aria-label="Type"
          onChange={(e) => set({ type: e.target.value })}
        />
        <datalist id={typeListId}>
          {TYPE_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </Field>
      <Field label="Climate">
        <Input value={p.climate} onChange={(e) => set({ climate: e.target.value })} />
      </Field>
      <Field label="Population">
        <Input value={p.population} onChange={(e) => set({ population: e.target.value })} />
      </Field>
      <Field label="Government">
        <Input value={p.government} onChange={(e) => set({ government: e.target.value })} />
      </Field>
      <Field label="Danger level">
        <Input value={p.dangerLevel} onChange={(e) => set({ dangerLevel: e.target.value })} />
      </Field>

      <div className="col-span-2 sm:col-span-4">
        <Field label="Notable features" hint="Comma- or line-separated — each one becomes a tag.">
          <Textarea rows={2} value={p.notableFeatures} onChange={(e) => set({ notableFeatures: e.target.value })} />
        </Field>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <Field label="Atmosphere" hint="What it feels like to be there.">
          <Textarea rows={2} value={p.atmosphere} onChange={(e) => set({ atmosphere: e.target.value })} />
        </Field>
      </div>
    </ProfileSection>
  );
}
