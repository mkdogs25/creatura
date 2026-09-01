import { useCallback } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { kindOfId } from '@/utils/id';

/**
 * Single place that knows how to "go to" any entity in the application.
 *
 * Every cross-link — an @mention, a matrix cell, a search result, a map marker
 * — routes through here, so navigation behaviour stays identical no matter
 * which view the click came from.
 */
export function useNavigation() {
  const setView = useUiStore((s) => s.setView);
  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const isNarrow = useUiStore((s) => s.isNarrow);

  const openDoc = useCallback(
    (docId: string) => {
      setView('library');
      setActiveDoc(docId);
      // Coming from another view, the metadata panel is the thing the reader
      // most likely wanted — but never force it open on a phone.
      if (!isNarrow) toggleRightPanel(true);
    },
    [setView, setActiveDoc, toggleRightPanel, isNarrow],
  );

  const openEvent = useCallback(
    (eventId: string) => {
      setView('timeline');
      setFocusMode(false);
      // The timeline view reads the selection from the UI store on mount.
      useUiStore.setState({ view: 'timeline' });
      window.dispatchEvent(new CustomEvent('creatura:select-event', { detail: eventId }));
    },
    [setView, setFocusMode],
  );

  const openEntity = useCallback(
    (entityId: string) => {
      const kind = kindOfId(entityId);
      if (kind === 'event') {
        openEvent(entityId);
        return;
      }
      if (kind === 'character' || kind === 'location' || kind === 'note') {
        const exists = useProjectStore.getState().bundle;
        if (exists) openDoc(entityId);
        return;
      }
      if (kind === 'folder') {
        setView('library');
      }
    },
    [openDoc, openEvent, setView],
  );

  return { openDoc, openEvent, openEntity };
}
