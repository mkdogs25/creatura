import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { MetaField, MetaFieldType } from '@/types/domain';
import { newId } from '@/utils/id';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

interface MetadataFieldsProps {
  fields: MetaField[];
  onChange: (fields: MetaField[]) => void;
  /** Field labels offered when the list is empty, per document kind. */
  suggestions: string[];
}

const TYPES: Array<{ value: MetaFieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'longtext', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
];

/** Configurable key/value metadata. Any label the author wants is allowed. */
export function MetadataFields({ fields, onChange, suggestions }: MetadataFieldsProps) {
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  const addField = (label: string, type: MetaFieldType = 'text') => {
    onChange([...fields, { id: newId('tag'), label, type, value: '' }]);
  };

  const update = (id: string, patch: Partial<MetaField>) => {
    onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const unusedSuggestions = suggestions.filter(
    (label) => !fields.some((field) => field.label.toLowerCase() === label.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <div key={field.id} className="group grid grid-cols-[7.5rem_1fr_auto] items-start gap-1.5">
          {editingLabel === field.id ? (
            <Input
              autoFocus
              defaultValue={field.label}
              aria-label="Field name"
              onBlur={(event) => {
                update(field.id, { label: event.target.value.trim() || field.label });
                setEditingLabel(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                if (event.key === 'Escape') setEditingLabel(null);
              }}
              className="text-[0.74rem]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingLabel(field.id)}
              title="Rename this field"
              className="truncate pt-1.5 text-left text-[0.74rem] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
            >
              {field.label}
            </button>
          )}

          {field.type === 'longtext' ? (
            <textarea
              value={field.value}
              aria-label={field.label}
              rows={2}
              onChange={(event) => update(field.id, { value: event.target.value })}
              className="w-full resize-y rounded-[var(--radius-control)] border border-transparent bg-transparent px-1.5 py-1 text-[0.78rem] text-[var(--color-ink)] outline-none transition-colors hover:border-[var(--color-line)] focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-sunken)]"
            />
          ) : (
            <input
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={field.value}
              aria-label={field.label}
              placeholder="—"
              onChange={(event) => update(field.id, { value: event.target.value })}
              className="w-full rounded-[var(--radius-control)] border border-transparent bg-transparent px-1.5 py-1 text-[0.78rem] text-[var(--color-ink)] outline-none transition-colors hover:border-[var(--color-line)] focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-sunken)]"
            />
          )}

          <button
            type="button"
            aria-label={`Remove ${field.label}`}
            onClick={() => onChange(fields.filter((f) => f.id !== field.id))}
            className="mt-1 rounded p-1 text-[var(--color-ink-faint)] opacity-0 transition-opacity hover:text-[var(--color-danger)] group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {unusedSuggestions.slice(0, 6).map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => addField(label)}
              className="rounded border border-dashed border-[var(--color-line-strong)] px-1.5 py-0.5 text-[0.7rem] text-[var(--color-ink-faint)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              + {label}
            </button>
          ))}
        </div>
      )}

      <CustomFieldAdder onAdd={addField} types={TYPES} />
    </div>
  );
}

function CustomFieldAdder({
  onAdd,
  types,
}: {
  onAdd: (label: string, type: MetaFieldType) => void;
  types: Array<{ value: MetaFieldType; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<MetaFieldType>('text');

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="mt-1 px-1.5">
        <Plus size={12} />
        Custom field
      </Button>
    );
  }

  return (
    <form
      className="flex items-center gap-1.5 pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (!label.trim()) return;
        onAdd(label.trim(), type);
        setLabel('');
        setType('text');
        setOpen(false);
      }}
    >
      <Input
        autoFocus
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Field name"
        aria-label="New field name"
        className="text-[0.76rem]"
      />
      <Select
        value={type}
        aria-label="Field type"
        onChange={(event) => setType(event.target.value as MetaFieldType)}
        className="w-24 text-[0.76rem]"
      >
        {types.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="primary" size="sm">
        Add
      </Button>
    </form>
  );
}
