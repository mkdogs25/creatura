import { useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useNavigation } from '@/hooks/useNavigation';
import { bundleToExport, filenameFor, parseProjectFile } from '@/features/projects/portability';
import { buildProjectFromFolder } from '@/features/projects/folderImport';
import { downloadTextFile, pickMarkdownFolder, pickTextFile, pickTextFiles } from '@/utils/download';
import { markdownToDoc, titleFromFilename } from '@/utils/markdown';
import type { DocKind, ThemeMode, ViewId } from '@/types/domain';

/**
 * Actions shared by the command palette, the Quick Create menu, the keyboard
 * shortcuts and the settings screen — defined once so all four stay in step.
 */
export function useProjectActions() {
  const bundle = useProjectStore((s) => s.bundle);
  const createDocInStore = useProjectStore((s) => s.createDoc);
  const createFolderInStore = useProjectStore((s) => s.createFolder);
  const createTagInStore = useProjectStore((s) => s.createTag);
  const createEventInStore = useProjectStore((s) => s.createEvent);
  const importBundle = useProjectStore((s) => s.importBundle);

  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const activeDocId = useEditorStore((s) => s.activeDocId);

  const setView = useUiStore((s) => s.setView);
  const focusMode = useUiStore((s) => s.focusMode);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const toast = useUiStore((s) => s.toast);

  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);

  const { openEvent } = useNavigation();

  /**
   * Creating from within a location pre-associates the new character with it,
   * which is nearly always what was meant.
   */
  const createDoc = useCallback(
    (kind: DocKind) => {
      const current = activeDocId
        ? [...(bundle?.characters ?? []), ...(bundle?.locations ?? []), ...(bundle?.notes ?? [])].find(
            (doc) => doc.id === activeDocId,
          )
        : null;

      const folderId =
        current?.kind === kind ? current.folderId : defaultFolderFor(bundle, kind);
      const id = createDocInStore({ kind, folderId });
      if (!id) return;

      if (current && current.kind !== kind && (kind === 'character' || kind === 'location')) {
        useProjectStore.getState().createRelationship({
          fromId: id,
          toId: current.id,
          type: kind === 'character' ? 'Connected to' : 'Related to',
          directed: true,
          note: '',
        });
      }

      setView('library');
      setActiveDoc(id);
    },
    [bundle, activeDocId, createDocInStore, setActiveDoc, setView],
  );

  const createFolder = useCallback(() => {
    createFolderInStore({});
    setView('library');
    toast({ tone: 'success', title: 'Folder created', body: 'Rename it in the library panel.' });
  }, [createFolderInStore, setView, toast]);

  const createTag = useCallback(() => {
    const name = window.prompt('Tag name');
    if (!name?.trim()) return;
    createTagInStore(name);
    toast({ tone: 'success', title: `Created #${name.trim().replace(/^#/, '')}` });
  }, [createTagInStore, toast]);

  const createEvent = useCallback(() => {
    const id = createEventInStore({ title: 'New event', start: 1, duration: 1 });
    if (id) openEvent(id);
  }, [createEventInStore, openEvent]);

  const goto = useCallback((view: ViewId) => setView(view), [setView]);

  const toggleFocus = useCallback(() => {
    setView('library');
    setFocusMode(!focusMode);
  }, [focusMode, setFocusMode, setView]);

  const toggleTheme = useCallback(() => {
    const order: ThemeMode[] = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(settings.appearance.theme) + 1) % order.length];
    updateSettings('appearance', { theme: next });
  }, [settings.appearance.theme, updateSettings]);

  const exportProject = useCallback(() => {
    if (!bundle) {
      toast({ tone: 'error', title: 'No project open', body: 'Create or open a project first.' });
      return;
    }
    downloadTextFile(
      filenameFor(bundle.project.name),
      JSON.stringify(bundleToExport(bundle), null, 2),
    );
    updateSettings('lastExportAt', Date.now());
    toast({
      tone: 'success',
      title: 'Project exported',
      body: `${bundle.project.name} was written to a file on this device.`,
    });
  }, [bundle, toast, updateSettings]);

  /** Returns whether a project was actually imported, so callers that gate
   * further UI on it (closing a dialog, marking onboarding done) know
   * whether the file picker was cancelled or the file was rejected. */
  const importProject = useCallback(async (): Promise<boolean> => {
    const file = await pickTextFile();
    if (!file) return false;
    const result = parseProjectFile(file.text);
    if (!result.ok || !result.bundle) {
      toast({
        tone: 'error',
        title: 'Could not import that file',
        body: result.error ?? 'The file could not be read.',
        sticky: true,
      });
      return false;
    }
    await importBundle(result.bundle);
    setView('library');
    setActiveDoc(null);
    toast({
      tone: result.warnings.length > 0 ? 'info' : 'success',
      title: `Imported “${result.bundle.project.name}”`,
      body:
        result.warnings.length > 0
          ? result.warnings.join(' ')
          : 'Every record was read successfully.',
      duration: result.warnings.length > 0 ? 8000 : 4200,
    });
    return true;
  }, [importBundle, setActiveDoc, setView, toast]);

  /**
   * Reads one or more markdown/plain-text files and creates a note per file,
   * converting basic markdown formatting into the editor's own node types.
   * Returns the number actually imported, so callers can tell a cancelled
   * picker (0) from a real import.
   */
  const importMarkdownNotes = useCallback(
    async (folderId: string | null = null): Promise<number> => {
      const files = await pickTextFiles();
      if (files.length === 0) return 0;

      let firstId: string | null = null;
      for (const file of files) {
        const id = createDocInStore({
          kind: 'note',
          name: titleFromFilename(file.name),
          folderId,
          content: markdownToDoc(file.text),
        });
        firstId ??= id;
      }

      setView('library');
      if (firstId) setActiveDoc(firstId);
      toast({
        tone: 'success',
        title:
          files.length === 1
            ? `Imported “${titleFromFilename(files[0].name)}”`
            : `Imported ${files.length} notes`,
        body: files.length > 1 ? 'Each file became its own note.' : undefined,
      });
      return files.length;
    },
    [createDocInStore, setActiveDoc, setView, toast],
  );

  /**
   * Uploads a whole folder and turns it into a brand-new project: its
   * subfolders become Creatura folders and every markdown file inside
   * becomes a note, in place. Returns whether a project was actually
   * created, so callers can tell a cancelled picker from a real import.
   */
  const importFolderAsProject = useCallback(async (): Promise<boolean> => {
    const { rootName, files } = await pickMarkdownFolder();
    if (files.length === 0) {
      if (rootName) {
        toast({
          tone: 'error',
          title: 'No markdown files found',
          body: `“${rootName}” doesn't contain any .md or .markdown files.`,
        });
      }
      return false;
    }

    const bundle = buildProjectFromFolder(rootName, files);
    await importBundle(bundle);
    setActiveDoc(bundle.notes[0]?.id ?? null);
    setView('library');
    toast({
      tone: 'success',
      title: `Imported “${bundle.project.name}”`,
      body: `${bundle.notes.length} ${bundle.notes.length === 1 ? 'note' : 'notes'} across ${
        bundle.folders.length
      } ${bundle.folders.length === 1 ? 'folder' : 'folders'}.`,
    });
    return true;
  }, [importBundle, setActiveDoc, setView, toast]);

  return useMemo(
    () => ({
      createDoc,
      createFolder,
      createTag,
      createEvent,
      goto,
      toggleFocus,
      toggleTheme,
      exportProject,
      importProject,
      importMarkdownNotes,
      importFolderAsProject,
    }),
    [
      createDoc,
      createFolder,
      createTag,
      createEvent,
      goto,
      toggleFocus,
      toggleTheme,
      exportProject,
      importProject,
      importMarkdownNotes,
      importFolderAsProject,
    ],
  );
}

/** Picks the folder a new document of this kind most plausibly belongs in. */
function defaultFolderFor(
  bundle: ReturnType<typeof useProjectStore.getState>['bundle'],
  kind: DocKind,
): string | null {
  if (!bundle) return null;
  const byDefaultKind = bundle.folders.find((folder) => folder.defaultKind === kind);
  if (byDefaultKind) return byDefaultKind.id;
  const nameGuess = { character: 'characters', location: 'locations', note: 'notes' }[kind];
  const byName = bundle.folders.find((folder) => folder.name.toLowerCase() === nameGuess);
  return byName?.id ?? null;
}
