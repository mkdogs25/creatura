import { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useSettingsStore } from '@/store/settingsStore';
import { docById } from '@/store/selectors';
import { buildExtensions } from '@/components/editor/extensions';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import type { RichContent } from '@/types/domain';
import { cn } from '@/utils/cn';

const FONT_STACK: Record<string, string> = {
  charter: 'var(--font-prose)',
  inter: 'var(--font-sans)',
  'system-serif': 'Georgia, Cambria, "Times New Roman", serif',
  mono: 'var(--font-mono)',
};

/**
 * The writing surface.
 *
 * The Tiptap instance is created once and then kept alive across document
 * switches, focus-mode toggles and panel changes — content is swapped with
 * `setContent`, and typography is driven by CSS variables. Re-creating the
 * editor would cost the caret, the selection and the undo history, which is
 * the one thing a writing tool may never do.
 */
export function ManuscriptEditor() {
  const activeDocId = useEditorStore((s) => s.activeDocId);
  const setEditor = useEditorStore((s) => s.setEditor);
  const setCounts = useEditorStore((s) => s.setCounts);
  const setDirty = useEditorStore((s) => s.setDirty);
  const reloadToken = useEditorStore((s) => s.reloadToken);
  const updateDocContent = useProjectStore((s) => s.updateDocContent);
  const editorSettings = useSettingsStore((s) => s.settings.editor);
  const writingSettings = useSettingsStore((s) => s.settings.writing);

  // Only the two typography-rewrite options change the extension set.
  const extensions = useMemo(
    () => buildExtensions(writingSettings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [writingSettings.smartQuotes, writingSettings.emDashes, writingSettings.autoCapitalize],
  );

  /** The document (and revision of it) the editor's content belongs to. */
  const loadedDocId = useRef<string | null>(null);
  const loadedToken = useRef(reloadToken);

  const save = useDebouncedCallback((docId: string, content: RichContent) => {
    updateDocContent(docId, content);
    setDirty(false);
  }, Math.max(200, writingSettings.autosaveDelay));

  const editor = useEditor(
    {
      extensions,
      autofocus: false,
      editorProps: {
        attributes: {
          class: cn(
            'creatura-prose',
            editorSettings.typewriterMode && 'is-typewriter',
          ),
          spellcheck: String(editorSettings.spellcheck),
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': 'Manuscript',
        },
      },
      onUpdate: ({ editor: instance }) => {
        const docId = loadedDocId.current;
        if (!docId) return;
        setDirty(true);
        const storage = instance.storage.characterCount as
          | { words: () => number; characters: () => number }
          | undefined;
        setCounts(storage?.words() ?? 0, storage?.characters() ?? 0);
        if (writingSettings.autosave) {
          save.run(docId, instance.getJSON() as RichContent);
        }
      },
    },
    [extensions],
  );

  // Register the instance so the toolbar, shortcuts and focus mode can reach it.
  useEffect(() => {
    setEditor(editor ?? null);
    return () => setEditor(null);
  }, [editor, setEditor]);

  // Swap content when the open document changes, flushing the previous one
  // first so an in-flight edit is never dropped on navigation.
  useEffect(() => {
    if (!editor) return;
    if (loadedDocId.current === activeDocId && loadedToken.current === reloadToken) return;

    // Only flush when leaving a document — a restore has already replaced the
    // stored content, and re-saving the pre-restore text would undo it.
    if (loadedDocId.current !== activeDocId) save.flush();
    else save.cancel();

    const doc = docById(useProjectStore.getState().bundle, activeDocId);
    loadedDocId.current = activeDocId;
    loadedToken.current = reloadToken;

    if (!doc) {
      editor.commands.clearContent(false);
      setCounts(0, 0);
      return;
    }

    // `false` — do not emit an update, or the load would mark the doc dirty.
    editor.commands.setContent(doc.content as never, false);
    const storage = editor.storage.characterCount as
      | { words: () => number; characters: () => number }
      | undefined;
    setCounts(storage?.words() ?? 0, storage?.characters() ?? 0);
    setDirty(false);
  }, [editor, activeDocId, reloadToken, save, setCounts, setDirty]);

  // Persist anything outstanding when the tab goes away.
  useEffect(() => {
    const flush = () => save.flush();
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [save]);

  // Spellcheck and typewriter mode are DOM attributes on the same instance.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    dom.setAttribute('spellcheck', String(editorSettings.spellcheck));
    dom.classList.toggle('is-typewriter', editorSettings.typewriterMode);
  }, [editor, editorSettings.spellcheck, editorSettings.typewriterMode]);

  // Typewriter mode: keep the caret near the middle of the viewport.
  useEffect(() => {
    if (!editor || !editorSettings.typewriterMode) return;
    const onTransaction = () => {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      const scroller = editor.view.dom.closest('[data-editor-scroll]') as HTMLElement | null;
      if (!scroller) return;
      const target = scroller.getBoundingClientRect();
      const delta = coords.top - (target.top + target.height / 2);
      if (Math.abs(delta) > 24) scroller.scrollTop += delta;
    };
    editor.on('selectionUpdate', onTransaction);
    return () => {
      editor.off('selectionUpdate', onTransaction);
    };
  }, [editor, editorSettings.typewriterMode]);

  const styleVars = {
    '--editor-font': FONT_STACK[editorSettings.fontFamily] ?? 'var(--font-prose)',
    '--editor-size': `${editorSettings.fontSize}px`,
    '--editor-leading': String(editorSettings.lineHeight),
    '--editor-measure': `${editorSettings.writingWidth}px`,
    '--editor-paragraph-gap': String(editorSettings.paragraphSpacing),
  } as React.CSSProperties;

  return (
    <div
      data-editor-scroll
      className="scroll-thin h-full overflow-y-auto"
      style={styleVars}
      onClick={() => editor?.commands.focus()}
    >
      <EditorContent editor={editor} className="min-h-full pt-6" />
    </div>
  );
}
