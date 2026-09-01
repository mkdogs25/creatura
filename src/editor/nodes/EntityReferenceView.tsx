import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useProjectStore } from '@/store/projectStore';
import { docById } from '@/store/selectors';
import { useNavigation } from '@/hooks/useNavigation';

/**
 * Renders one `@mention` inside prose.
 *
 * The name shown always comes from the live store, which is what makes
 * references survive renames. When the target is gone the node degrades to a
 * clearly-marked placeholder rather than throwing.
 */
export function EntityReferenceView({ node }: NodeViewProps) {
  const entityId = String(node.attrs.entityId ?? '');
  const fallbackLabel = String(node.attrs.label ?? '');
  const doc = useProjectStore((state) => docById(state.bundle, entityId));
  const { openEntity } = useNavigation();

  const resolved = doc !== null;
  const label = doc?.name ?? (fallbackLabel ? `${fallbackLabel} — deleted` : 'Deleted entity');

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className={`entity-ref${resolved ? '' : ' is-unresolved'}`}
        role="link"
        tabIndex={0}
        contentEditable={false}
        aria-label={
          resolved ? `Open ${label}` : `Unresolved reference to a deleted entity`
        }
        title={resolved ? `Open ${label}` : 'This entity has been deleted'}
        onClick={(event) => {
          event.preventDefault();
          if (resolved) openEntity(entityId);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (resolved) openEntity(entityId);
          }
        }}
      >
        @{label}
      </span>
    </NodeViewWrapper>
  );
}
