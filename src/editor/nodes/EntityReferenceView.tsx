import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useProjectStore } from '@/store/projectStore';
import { docById } from '@/store/selectors';
import { useNavigation } from '@/hooks/useNavigation';
import { firstWord } from '@/utils/text';

/**
 * Renders one entity reference inside prose — an `@`-mention or a `[[`
 * wiki-link.
 *
 * The name shown always comes from the live store, which is what makes
 * references survive renames. When the target is gone the node degrades to a
 * clearly-marked placeholder rather than throwing. `@`-mentions (`short:
 * true`) show only the resolved name's first word — "Elysia", not "Elysia
 * Ambrose" — while wiki-links keep showing the full name.
 */
export function EntityReferenceView({ node }: NodeViewProps) {
  const entityId = String(node.attrs.entityId ?? '');
  const fallbackLabel = String(node.attrs.label ?? '');
  const short = Boolean(node.attrs.short);
  const doc = useProjectStore((state) => docById(state.bundle, entityId));
  const { openEntity } = useNavigation();

  const resolved = doc !== null;
  const liveName = doc ? (short ? firstWord(doc.name) : doc.name) : null;
  const label = liveName ?? (fallbackLabel ? `${fallbackLabel} — deleted` : 'Deleted entity');

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
