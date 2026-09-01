import type { Editor } from '@tiptap/react';
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';

interface ToolbarProps {
  editor: Editor | null;
}

interface Control {
  id: string;
  label: string;
  shortcut?: string;
  icon: typeof Bold;
  isActive?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
  separatorBefore?: boolean;
}

const CONTROLS: Control[] = [
  {
    id: 'bold',
    label: 'Bold',
    shortcut: '⌘B',
    icon: Bold,
    isActive: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    label: 'Italic',
    shortcut: '⌘I',
    icon: Italic,
    isActive: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    id: 'underline',
    label: 'Underline',
    shortcut: '⌘U',
    icon: UnderlineIcon,
    isActive: (e) => e.isActive('underline'),
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    id: 'h1',
    label: 'Heading 1',
    icon: Heading1,
    separatorBefore: true,
    isActive: (e) => e.isActive('heading', { level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: Heading2,
    isActive: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: Heading3,
    isActive: (e) => e.isActive('heading', { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bullet',
    label: 'Bullet list',
    icon: List,
    separatorBefore: true,
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: 'Numbered list',
    icon: ListOrdered,
    isActive: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'quote',
    label: 'Block quote',
    icon: Quote,
    isActive: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'rule',
    label: 'Separator',
    icon: Minus,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'link',
    label: 'Link',
    icon: Link2,
    separatorBefore: true,
    isActive: (e) => e.isActive('link'),
    run: (editor) => {
      if (editor.isActive('link')) {
        editor.chain().focus().unsetLink().run();
        return;
      }
      const url = window.prompt('Link address');
      if (!url) return;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    },
  },
  {
    id: 'undo',
    label: 'Undo',
    shortcut: '⌘Z',
    icon: Undo2,
    separatorBefore: true,
    run: (e) => e.chain().focus().undo().run(),
  },
  {
    id: 'redo',
    label: 'Redo',
    shortcut: '⇧⌘Z',
    icon: Redo2,
    run: (e) => e.chain().focus().redo().run(),
  },
];

/** Formatting controls for the manuscript surface. */
export function EditorToolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="flex flex-wrap items-center gap-0.5 px-3 py-1.5"
    >
      {CONTROLS.map((control) => {
        const Icon = control.icon;
        const active = control.isActive?.(editor) ?? false;
        return (
          <span key={control.id} className="flex items-center">
            {control.separatorBefore && (
              <span className="mx-1.5 h-4 w-px bg-[var(--color-line)]" aria-hidden="true" />
            )}
            <Tooltip
              label={
                control.shortcut ? `${control.label} · ${control.shortcut}` : control.label
              }
            >
              <button
                type="button"
                aria-label={control.label}
                aria-pressed={control.isActive ? active : undefined}
                onClick={() => control.run(editor)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] transition-colors',
                  active
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)]',
                )}
              >
                <Icon size={14} aria-hidden="true" />
              </button>
            </Tooltip>
          </span>
        );
      })}
    </div>
  );
}
