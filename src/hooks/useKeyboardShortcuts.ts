import { useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { docById } from '@/store/selectors';
import type { RichContent } from '@/types/domain';

/** True when the event came from a text field the user is typing into. */
function inTextField(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    element.isContentEditable === true
  );
}

/**
 * Global keyboard shortcuts.
 *
 * Bindings that would collide with typing (the view-switching digits) are
 * suppressed inside text fields; the rest work everywhere, because ⌘S and ⌘K
 * are most useful precisely while writing.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const ui = useUiStore.getState();

      if (event.key === 'Escape') {
        if (ui.paletteOpen) {
          ui.closePalette();
          return;
        }
        if (useEditorStore.getState().findReplaceOpen) {
          useEditorStore.getState().setFindReplaceOpen(false);
          return;
        }
        if (ui.focusMode) {
          ui.setFocusMode(false);
          return;
        }
        return;
      }

      if (!mod) return;

      switch (event.key.toLowerCase()) {
        case 'k': {
          event.preventDefault();
          if (ui.paletteOpen) ui.closePalette();
          else ui.openPalette('all');
          return;
        }
        case 's': {
          // Flush the editor's pending content immediately.
          event.preventDefault();
          const { activeDocId, activeChapterId, editor, setDirty } = useEditorStore.getState();
          if (editor && (activeDocId || activeChapterId)) {
            const content = editor.getJSON() as RichContent;
            if (activeChapterId && ui.view === 'manuscript') {
              useProjectStore.getState().updateChapterContent(activeChapterId, content);
            } else if (activeDocId) {
              useProjectStore.getState().updateDocContent(activeDocId, content);
            }
            setDirty(false);
          }
          ui.toast({ tone: 'success', title: 'Saved', duration: 1600 });
          return;
        }
        case ',': {
          event.preventDefault();
          ui.setView('settings');
          return;
        }
        case '.': {
          event.preventDefault();
          if (ui.view !== 'manuscript') ui.setView('library');
          ui.setFocusMode(!ui.focusMode);
          return;
        }
        case '\\': {
          event.preventDefault();
          ui.toggleLeftPanel();
          return;
        }
        case '/': {
          event.preventDefault();
          ui.toggleRightPanel();
          return;
        }
        case 'f': {
          const editorState = useEditorStore.getState();
          if (!editorState.editor) return;
          event.preventDefault();
          editorState.setFindReplaceOpen(true);
          return;
        }
        default:
          break;
      }

      if (inTextField(event.target)) return;

      if (event.key === '1') {
        event.preventDefault();
        ui.setView('library');
      } else if (event.key === '2') {
        event.preventDefault();
        ui.setView('timeline');
      } else if (event.key === '3') {
        event.preventDefault();
        ui.setView('manuscript');
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}

/** Warns before closing the tab while an edit is still un-persisted. */
export function useUnsavedGuard(): void {
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const { dirty, activeDocId, editor } = useEditorStore.getState();
      if (!dirty || !activeDocId || !editor) return;
      // Persist synchronously-ish, then still prompt: IndexedDB writes are
      // async and may not complete during unload.
      useProjectStore
        .getState()
        .updateDocContent(activeDocId, editor.getJSON() as RichContent);
      const doc = docById(useProjectStore.getState().bundle, activeDocId);
      if (!doc) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
}

/** Tracks the narrow-viewport breakpoint for the responsive layout. */
export function useResponsiveLayout(): void {
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const apply = () => {
      const narrow = query.matches;
      const ui = useUiStore.getState();
      ui.setIsNarrow(narrow);
      // Side panels start closed on small screens: they are drawers there.
      if (narrow) {
        ui.toggleLeftPanel(false);
        ui.toggleRightPanel(false);
      }
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);
}
