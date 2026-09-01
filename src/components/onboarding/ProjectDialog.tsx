import { useMemo, useState } from 'react';
import { ChevronRight, FolderTree } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { useEditorStore } from '@/store/editorStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { TEMPLATES, templateById, type TemplateFolder } from '@/data/templates';
import type { TemplateId } from '@/types/domain';
import { cn } from '@/utils/cn';

/**
 * Project onboarding. The folder preview updates as the template changes, so
 * the structure is visible before anything is written to the database.
 */
export function ProjectDialog() {
  const open = useUiStore((s) => s.projectDialogOpen);
  const setOpen = useUiStore((s) => s.setProjectDialogOpen);
  const setView = useUiStore((s) => s.setView);
  const toast = useUiStore((s) => s.toast);
  const createProject = useProjectStore((s) => s.createProject);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<TemplateId>('fantasy');
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => templateById(template).folders, [template]);

  const reset = () => {
    setName('');
    setDescription('');
    setTemplate('fantasy');
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await createProject({ name: name.trim() || 'Untitled project', description, template });
      setActiveDoc(null);
      setView('library');
      setOpen(false);
      reset();
      toast({
        tone: 'success',
        title: 'Project created',
        body: 'Your world library is ready.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="New project"
      description="Projects are fully separate. Nothing is shared between them."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            Create project
          </Button>
        </>
      }
    >
      <form
        className="grid gap-5 sm:grid-cols-[1fr_15rem]"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-4">
          <Field label="Project name" htmlFor="project-name">
            <Input
              id="project-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="The Salt Verses"
            />
          </Field>

          <Field label="Description" htmlFor="project-description" hint="Optional.">
            <Textarea
              id="project-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this world about?"
            />
          </Field>

          <fieldset>
            <legend className="mb-2 text-[0.78rem] font-medium text-[var(--color-ink)]">
              Genre template
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={template === option.id}
                  onClick={() => setTemplate(option.id)}
                  className={cn(
                    'rounded-[var(--radius-control)] border px-3 py-2 text-left transition-colors',
                    template === option.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                  )}
                >
                  <span className="block text-[0.82rem] font-medium text-[var(--color-ink)]">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[0.7rem] leading-snug text-[var(--color-ink-faint)]">
                    {option.tagline}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3">
          <h3 className="type-label mb-2 flex items-center gap-1.5">
            <FolderTree size={11} aria-hidden="true" />
            Folder structure
          </h3>
          {preview.length === 0 ? (
            <p className="text-[0.74rem] leading-relaxed text-[var(--color-ink-faint)]">
              An empty library. You will build the structure yourself.
            </p>
          ) : (
            <FolderPreview nodes={preview} />
          )}
          <p className="mt-3 border-t border-[var(--color-line)] pt-2.5 text-[0.7rem] leading-relaxed text-[var(--color-ink-faint)]">
            A starting point, not a restriction — rename, move or delete any of it later.
          </p>
        </aside>
      </form>
    </Modal>
  );
}

function FolderPreview({ nodes, depth = 0 }: { nodes: TemplateFolder[]; depth?: number }) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <li key={node.name}>
          <span
            className="flex items-center gap-1 text-[0.75rem] text-[var(--color-ink-muted)]"
            style={{ paddingLeft: depth * 10 }}
          >
            {depth > 0 && (
              <ChevronRight size={9} className="text-[var(--color-ink-faint)]" aria-hidden="true" />
            )}
            {node.name}
          </span>
          {node.children && <FolderPreview nodes={node.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}
