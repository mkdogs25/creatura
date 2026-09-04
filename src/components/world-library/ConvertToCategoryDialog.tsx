import { useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { orderedCategories } from '@/store/selectors';
import { Modal } from '@/components/ui/Modal';
import { folderIcon } from '@/components/world-library/folderIcons';
import { singularize } from '@/utils/text';
import type { NoteDoc } from '@/types/domain';

/**
 * Turns a note into a document in one of the project's categories — built-in
 * or custom. Any "Label: value" lines in the note become that category's
 * matching fields automatically; the rest of the note stays exactly as
 * written, just no longer shown once the category takes over the page.
 */
export function ConvertToCategoryDialog({
  doc,
  onClose,
}: {
  doc: NoteDoc | null;
  onClose: () => void;
}) {
  const bundle = useProjectStore((s) => s.bundle);
  const convertDocToCategory = useProjectStore((s) => s.convertDocToCategory);
  const closeTab = useEditorStore((s) => s.closeTab);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const toast = useUiStore((s) => s.toast);

  const categories = useMemo(() => orderedCategories(bundle), [bundle]);

  return (
    <Modal
      open={Boolean(doc)}
      onClose={onClose}
      title="Convert to category"
      description={
        doc
          ? `Pick what “${doc.name}” becomes. Any “Label: value” lines in its text fill in the matching fields automatically.`
          : undefined
      }
      size="sm"
    >
      <div className="flex flex-col gap-1">
        {categories.map((category) => {
          const Icon = folderIcon(category.icon);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                if (!doc) return;
                const newId = convertDocToCategory(doc.id, category.id);
                if (!newId) {
                  toast({ tone: 'error', title: 'Could not convert that note.' });
                  return;
                }
                closeTab(doc.id);
                setActiveDoc(newId);
                toast({
                  tone: 'success',
                  title: `Converted to ${singularize(category.name)}`,
                });
                onClose();
              }}
              className="flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
            >
              <Icon size={15} className="shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
              <span className="truncate text-[0.85rem] text-[var(--color-ink)]">
                {singularize(category.name)}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
