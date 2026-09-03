import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderCog, Plus, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { orderedCategories } from '@/store/selectors';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { Field, Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { folderIcon, FOLDER_ICON_NAMES } from '@/components/world-library/folderIcons';
import { singularize } from '@/utils/text';
import { cn } from '@/utils/cn';
import type { Category, CategoryField, CategoryFieldType, TagMirror } from '@/types/domain';

const FIELD_TYPE_OPTIONS: Array<{ value: CategoryFieldType; label: string }> = [
  { value: 'text', label: 'Single line' },
  { value: 'textarea', label: 'Multi-line' },
];

const TAG_MIRROR_OPTIONS: Array<{ value: TagMirror; label: string }> = [
  { value: 'none', label: 'No tag' },
  { value: 'single', label: 'One tag' },
  { value: 'list', label: 'Several tags' },
];

/** A small button that opens a grid of the shared folder-icon set. */
function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const Icon = folderIcon(value);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Change icon"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <Icon size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 grid w-48 grid-cols-6 gap-1 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-overlay)] p-2 shadow-[var(--shadow-float)]">
          {FOLDER_ICON_NAMES.map((name) => {
            const OptionIcon = folderIcon(name);
            const active = name === value;
            return (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={active}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] transition-colors',
                  active
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)]',
                )}
              >
                <OptionIcon size={14} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FieldRow({
  field,
  onUpdate,
  onDelete,
}: {
  field: CategoryField;
  onUpdate: (patch: Partial<CategoryField>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_7rem_7rem_1.75rem] items-center gap-1.5 py-2">
      <input
        defaultValue={field.label}
        aria-label="Field label"
        onBlur={(event) => {
          const label = event.target.value.trim();
          if (label && label !== field.label) onUpdate({ label });
          else event.target.value = field.label;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        }}
        className="min-w-0 rounded-[var(--radius-control)] border border-transparent bg-transparent px-1.5 py-1 text-[0.8rem] text-[var(--color-ink)] outline-none transition-colors hover:border-[var(--color-line)] focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-sunken)]"
      />
      <Select
        aria-label="Field type"
        value={field.type}
        onChange={(event) => onUpdate({ type: event.target.value as CategoryFieldType })}
        className="py-1 text-[0.7rem]"
      >
        {FIELD_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Tag mirroring"
        value={field.tagMirror}
        onChange={(event) => onUpdate({ tagMirror: event.target.value as TagMirror })}
        className="py-1 text-[0.7rem]"
      >
        {TAG_MIRROR_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <button
        type="button"
        aria-label={`Delete field ${field.label}`}
        onClick={onDelete}
        className="shrink-0 rounded p-1.5 text-[var(--color-ink-faint)] opacity-0 transition-opacity hover:text-[var(--color-danger)] group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const updateCategory = useProjectStore((s) => s.updateCategory);
  const deleteCategory = useProjectStore((s) => s.deleteCategory);
  const addCategoryField = useProjectStore((s) => s.addCategoryField);
  const updateCategoryField = useProjectStore((s) => s.updateCategoryField);
  const deleteCategoryField = useProjectStore((s) => s.deleteCategoryField);
  const confirm = useUiStore((s) => s.confirm);
  const toast = useUiStore((s) => s.toast);

  return (
    <SettingsSection title={category.name}>
      <div className="flex items-center gap-2 py-2">
        <IconPicker value={category.icon} onChange={(icon) => updateCategory(category.id, { icon })} />
        <input
          defaultValue={category.name}
          aria-label="Category name"
          onBlur={(event) => {
            const name = event.target.value.trim();
            if (name && name !== category.name) updateCategory(category.id, { name });
            else event.target.value = category.name;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
          }}
          className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-2.5 py-1.5 text-[0.85rem] font-medium text-[var(--color-ink)] transition-colors focus:border-[var(--color-accent)] focus:outline-none"
        />
        {category.builtin ? (
          <span className="shrink-0 rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[0.66rem] text-[var(--color-ink-faint)]">
            Built-in
          </span>
        ) : (
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              const ok = await confirm({
                title: `Delete “${category.name}”?`,
                body: 'Every entry in this category is deleted along with it.',
                detail: 'This cannot be undone.',
                confirmLabel: 'Delete category',
                destructive: true,
              });
              if (!ok) return;
              deleteCategory(category.id);
              toast({ tone: 'info', title: `Deleted “${category.name}”` });
            }}
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>

      {category.fields.length > 0 && (
        <div className="divide-y divide-[var(--color-line)]">
          {category.fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              onUpdate={(patch) => updateCategoryField(category.id, field.id, patch)}
              onDelete={() => deleteCategoryField(category.id, field.id)}
            />
          ))}
        </div>
      )}

      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="px-1.5"
          onClick={() =>
            addCategoryField(category.id, { label: 'New field', type: 'text', tagMirror: 'none' })
          }
        >
          <Plus size={12} aria-hidden="true" />
          Add field
        </Button>
      </div>

      <p className="pt-2 text-[0.7rem] leading-relaxed text-[var(--color-ink-faint)]">
        These become the {singularize(category.name).toLowerCase()} profile form — no prose editor,
        just the fields above. "One tag" and "several tags" mirror a field's value onto this
        document's tags automatically.
      </p>
    </SettingsSection>
  );
}

/** Create custom document categories, and edit the input fields of any
 * category — built-in (Character, Location, Creature, Tech) or your own.
 * None of them carry a prose editor; documents are the fields you define. */
export function CategoriesPanel() {
  const bundle = useProjectStore((s) => s.bundle);
  const createCategory = useProjectStore((s) => s.createCategory);
  const toast = useUiStore((s) => s.toast);

  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('folder');

  const categories = useMemo(() => orderedCategories(bundle), [bundle]);

  if (!bundle) {
    return (
      <EmptyState
        icon={FolderCog}
        title="No project open."
        body="Open a project to manage its categories."
        compact
      />
    );
  }

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createCategory({ name, icon: newIcon });
    setNewName('');
    setNewIcon('folder');
    toast({ tone: 'success', title: `Created “${name}”` });
  };

  return (
    <>
      <SettingsSection
        title="Add a category"
        description="A category is a document kind with its own input fields — like Characters or Locations, but yours. Its documents never have a prose editor, only the fields you set below."
      >
        <div className="flex items-end gap-2 py-2">
          <IconPicker value={newIcon} onChange={setNewIcon} />
          <div className="min-w-0 flex-1">
            <Field label="Name" htmlFor="new-category-name">
              <Input
                id="new-category-name"
                placeholder="e.g. Artifacts, Factions, Vehicles"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCreate();
                }}
              />
            </Field>
          </div>
          <Button variant="primary" onClick={handleCreate} disabled={!newName.trim()}>
            <Plus size={14} aria-hidden="true" />
            Create
          </Button>
        </div>
      </SettingsSection>

      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </>
  );
}
