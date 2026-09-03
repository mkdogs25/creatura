import { useProjectStore } from '@/store/projectStore';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { folderIcon } from '@/components/world-library/folderIcons';
import { singularize } from '@/utils/text';
import type { AnyDoc, Category } from '@/types/domain';

interface CategoryProfileFieldsProps {
  doc: AnyDoc;
  category: Category;
}

/**
 * A category's structured fields — the entire editing surface for a
 * Character, Location, Creature, Tech or custom-category document, none of
 * which keep a prose editor any more. Field ids, types and tag-mirroring are
 * all data on the category itself (Settings → Categories), so this renders
 * whatever's currently defined rather than a fixed shape per kind.
 */
export function CategoryProfileFields({ doc, category }: CategoryProfileFieldsProps) {
  const updateDocProfile = useProjectStore((s) => s.updateDocProfile);
  const Icon = folderIcon(category.icon);
  const profile = 'profile' in doc ? doc.profile : {};
  const set = (fieldId: string, value: string) => updateDocProfile(doc.id, { [fieldId]: value });

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-10 sm:px-6">
      <div className="mb-3 flex items-center gap-1.5 text-[var(--color-ink-faint)]">
        <Icon size={12} className="shrink-0" aria-hidden="true" />
        <span className="type-label">{singularize(category.name)} Profile</span>
      </div>

      {category.fields.length === 0 ? (
        <p className="text-[0.8rem] leading-relaxed text-[var(--color-ink-faint)]">
          This category has no fields yet — add some in Settings → Categories.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {category.fields.map((field) => (
            <div key={field.id} className={field.type === 'textarea' ? 'col-span-2 sm:col-span-4' : undefined}>
              <Field label={field.label} hint={field.hint}>
                {field.type === 'textarea' ? (
                  <Textarea
                    rows={4}
                    value={profile[field.id] ?? ''}
                    onChange={(e) => set(field.id, e.target.value)}
                  />
                ) : (
                  <>
                    <Input
                      list={field.suggestions?.length ? `catfield-${field.id}` : undefined}
                      value={profile[field.id] ?? ''}
                      onChange={(e) => set(field.id, e.target.value)}
                    />
                    {field.suggestions && field.suggestions.length > 0 && (
                      <datalist id={`catfield-${field.id}`}>
                        {field.suggestions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    )}
                  </>
                )}
              </Field>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
