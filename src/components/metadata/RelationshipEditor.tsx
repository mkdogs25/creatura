import { useMemo, useState } from 'react';
import { ArrowRight, Plus, Trash2, Unlink } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { docById, relationshipsFor } from '@/store/selectors';
import { useNavigation } from '@/hooks/useNavigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EntityPicker } from '@/components/ui/EntityPicker';

const COMMON_TYPES = [
  'Friend',
  'Enemy',
  'Family',
  'Rival',
  'Mentor',
  'Lives in',
  'Works at',
  'Born in',
  'Member of',
  'Owns',
  'Knows of',
];

interface RelationshipEditorProps {
  entityId: string;
}

/**
 * Relationships between canonical entities. Each row is a real record, so the
 * same link shows up on both sides and in the matrix.
 */
export function RelationshipEditor({ entityId }: RelationshipEditorProps) {
  const bundle = useProjectStore((s) => s.bundle);
  const createRelationship = useProjectStore((s) => s.createRelationship);
  const deleteRelationship = useProjectStore((s) => s.deleteRelationship);
  const updateRelationship = useProjectStore((s) => s.updateRelationship);
  const { openEntity } = useNavigation();

  const [adding, setAdding] = useState(false);
  const [type, setType] = useState('Friend');
  const [targetIds, setTargetIds] = useState<string[]>([]);

  const links = useMemo(() => relationshipsFor(bundle, entityId), [bundle, entityId]);

  const submit = () => {
    const target = targetIds[0];
    if (!target || !type.trim()) return;
    createRelationship({
      fromId: entityId,
      toId: target,
      type: type.trim(),
      directed: true,
      note: '',
    });
    setTargetIds([]);
    setAdding(false);
  };

  return (
    <div className="space-y-1.5">
      {links.length === 0 && !adding && (
        <p className="py-1 text-[0.76rem] text-[var(--color-ink-faint)]">
          No connections yet.
        </p>
      )}

      {links.map(({ relationship, otherId, outgoing }) => {
        const other = docById(bundle, otherId);
        return (
          <div
            key={relationship.id}
            className="group flex items-center gap-1.5 rounded-[var(--radius-control)] px-1 py-1 transition-colors hover:bg-[var(--color-surface-raised)]"
          >
            <input
              value={relationship.type}
              aria-label="Relationship type"
              onChange={(event) =>
                updateRelationship(relationship.id, { type: event.target.value })
              }
              className="w-[6.5rem] shrink-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-[0.74rem] text-[var(--color-ink-muted)] outline-none hover:border-[var(--color-line)] focus:border-[var(--color-accent)]"
            />
            <ArrowRight
              size={11}
              className={`shrink-0 text-[var(--color-ink-faint)] ${outgoing ? '' : 'rotate-180'}`}
              aria-hidden="true"
            />
            {other ? (
              <button
                type="button"
                onClick={() => openEntity(other.id)}
                className="min-w-0 flex-1 truncate text-left text-[0.78rem] text-[var(--color-accent)] hover:underline"
              >
                {other.name}
              </button>
            ) : (
              <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-[0.78rem] italic text-[var(--color-ink-faint)]">
                <Unlink size={10} aria-hidden="true" />
                Deleted entity
              </span>
            )}
            <button
              type="button"
              aria-label="Remove relationship"
              onClick={() => deleteRelationship(relationship.id)}
              className="shrink-0 rounded p-1 text-[var(--color-ink-faint)] opacity-0 transition-opacity hover:text-[var(--color-danger)] group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 size={11} />
            </button>
          </div>
        );
      })}

      {adding ? (
        <div className="space-y-1.5 rounded-[var(--radius-control)] border border-[var(--color-line)] p-2">
          <div className="flex gap-1.5">
            <Input
              list="creatura-relationship-types"
              value={type}
              onChange={(event) => setType(event.target.value)}
              placeholder="Relationship"
              aria-label="Relationship type"
              className="w-32 text-[0.76rem]"
            />
            <datalist id="creatura-relationship-types">
              {COMMON_TYPES.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <div className="min-w-0 flex-1">
              <EntityPicker
                label="Related entity"
                value={targetIds}
                onChange={setTargetIds}
                multiple={false}
                exclude={[entityId]}
                placeholder="Link to…"
              />
            </div>
          </div>
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={submit} disabled={targetIds.length === 0}>
              Add link
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="px-1.5">
          <Plus size={12} />
          Add relationship
        </Button>
      )}
    </div>
  );
}
