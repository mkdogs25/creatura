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
import { docToMarkdown } from '@/utils/markdownExport';
import { docById, orderedChapters } from '@/store/selectors';
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
  const createChapterInStore = useProjectStore((s) => s.createChapter);
  const importBundle = useProjectStore((s) => s.importBundle);
  const duplicateProjectInStore = useProjectStore((s) => s.duplicateProject);
  const archiveProjectInStore = useProjectStore((s) => s.archiveProject);
  const deleteProjectInStore = useProjectStore((s) => s.deleteProject);

  const setActiveDoc = useEditorStore((s) => s.setActiveDoc);
  const activeDocId = useEditorStore((s) => s.activeDocId);
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter);

  const setView = useUiStore((s) => s.setView);
  const setSettingsCategory = useUiStore((s) => s.setSettingsCategory);
  const focusMode = useUiStore((s) => s.focusMode);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const toast = useUiStore((s) => s.toast);
  const confirm = useUiStore((s) => s.confirm);
  const setProjectDialogOpen = useUiStore((s) => s.setProjectDialogOpen);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);

  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);

  const { openEvent } = useNavigation();

  /**
   * Creating from within a location pre-associates the new character with it,
   * which is nearly always what was meant.
   */
  const createDoc = useCallback(
    (kind: DocKind, categoryId?: string) => {
      const current = activeDocId
        ? [
            ...(bundle?.characters ?? []),
            ...(bundle?.locations ?? []),
            ...(bundle?.creatures ?? []),
            ...(bundle?.tech ?? []),
            ...(bundle?.customDocs ?? []),
            ...(bundle?.notes ?? []),
          ].find((doc) => doc.id === activeDocId)
        : null;

      const folderId =
        current?.kind === kind ? current.folderId : defaultFolderFor(bundle, kind);
      const id = createDocInStore({ kind, categoryId, folderId });
      if (!id) return;

      if (current && current.kind !== kind && kind !== 'note') {
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

  const createChapter = useCallback(() => {
    const id = createChapterInStore({});
    if (!id) return;
    setView('manuscript');
    setActiveChapter(id);
  }, [createChapterInStore, setActiveChapter, setView]);

  const goto = useCallback(
    (view: ViewId, settingsCategory?: string) => {
      setView(view);
      if (settingsCategory) setSettingsCategory(settingsCategory);
    },
    [setView, setSettingsCategory],
  );

  const toggleFocus = useCallback(() => {
    setView('library');
    setFocusMode(!focusMode);
  }, [focusMode, setFocusMode, setView]);

  const toggleTheme = useCallback(() => {
    const order: ThemeMode[] = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(settings.appearance.theme) + 1) % order.length];
    updateSettings('appearance', { theme: next });
  }, [settings.appearance.theme, updateSettings]);

  const toggleLibraryPanel = useCallback(() => toggleLeftPanel(), [toggleLeftPanel]);
  const toggleDetailsPanel = useCallback(() => toggleRightPanel(), [toggleRightPanel]);

  const openFindReplace = useCallback(() => {
    useEditorStore.getState().setFindReplaceOpen(true);
  }, []);

  const toggleToolbar = useCallback(() => {
    updateSettings('editor', { showToolbar: !settings.editor.showToolbar });
  }, [settings.editor.showToolbar, updateSettings]);

  const toggleTypewriterMode = useCallback(() => {
    updateSettings('editor', { typewriterMode: !settings.editor.typewriterMode });
  }, [settings.editor.typewriterMode, updateSettings]);

  const toggleSpellcheck = useCallback(() => {
    updateSettings('editor', { spellcheck: !settings.editor.spellcheck });
  }, [settings.editor.spellcheck, updateSettings]);

  const toggleMatrixTab = useCallback(() => {
    updateSettings('interface', { showMatrixTab: !settings.interface.showMatrixTab });
  }, [settings.interface.showMatrixTab, updateSettings]);

  const newProject = useCallback(() => setProjectDialogOpen(true), [setProjectDialogOpen]);

  const duplicateCurrentProject = useCallback(async () => {
    const current = bundle?.project;
    if (!current) return;
    const id = await duplicateProjectInStore(current.id);
    if (id) {
      toast({
        tone: 'success',
        title: 'Project duplicated',
        body: 'The copy is fully independent of the original.',
      });
    }
  }, [bundle, duplicateProjectInStore, toast]);

  const archiveCurrentProject = useCallback(() => {
    const current = bundle?.project;
    if (!current) return;
    void archiveProjectInStore(current.id, !current.archived);
  }, [bundle, archiveProjectInStore]);

  const deleteCurrentProject = useCallback(async () => {
    const current = bundle?.project;
    if (!current) return;
    const ok = await confirm({
      title: `Delete “${current.name}”?`,
      body: 'Every note, character, location, event and map in it is removed.',
      detail: 'This cannot be undone. Export the project first if you might want it back.',
      confirmLabel: 'Delete permanently',
      destructive: true,
    });
    if (!ok) return;
    setActiveDoc(null);
    await deleteProjectInStore(current.id);
    toast({ tone: 'info', title: `Deleted “${current.name}”` });
  }, [bundle, confirm, deleteProjectInStore, setActiveDoc, toast]);

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

  /** Concatenates every chapter, in order, into one markdown file — the
   * manuscript's own export, separate from the JSON project backup. */
  const exportManuscriptAsMarkdown = useCallback(() => {
    if (!bundle) {
      toast({ tone: 'error', title: 'No project open', body: 'Create or open a project first.' });
      return;
    }
    const chapters = orderedChapters(bundle);
    if (chapters.length === 0) {
      toast({ tone: 'error', title: 'No chapters yet', body: 'Write something in Manuscript first.' });
      return;
    }
    const resolveEntity = (entityId: string, fallback: string) =>
      docById(bundle, entityId)?.name ?? fallback;
    const text = chapters
      .map((chapter) => `# ${chapter.title}\n\n${docToMarkdown(chapter.content, resolveEntity)}`)
      .join('\n\n---\n\n');
    downloadTextFile(`${bundle.project.name}.md`, text, 'text/markdown');
    toast({ tone: 'success', title: 'Manuscript exported', body: `${chapters.length} chapters written to a markdown file.` });
  }, [bundle, toast]);

  /** Opens a print-ready view of the manuscript in a new tab — "Save as PDF"
   * in the browser's own print dialog is the actual export, which produces
   * a real text-based PDF rather than a rasterized image. */
  const exportManuscriptAsPdf = useCallback(() => {
    if (!bundle) {
      toast({ tone: 'error', title: 'No project open', body: 'Create or open a project first.' });
      return;
    }
    window.open(`${window.location.pathname}?print=manuscript`, '_blank', 'noopener');
  }, [bundle, toast]);

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
   * Reads one or more markdown/plain-text files and creates a manuscript
   * chapter per file, in the order they were selected — the Manuscript
   * view's equivalent of importing markdown as notes. Returns the number
   * actually imported, so callers can tell a cancelled picker (0) from a
   * real import.
   */
  const importMarkdownChapters = useCallback(async (): Promise<number> => {
    const files = await pickTextFiles();
    if (files.length === 0) return 0;

    let firstId: string | null = null;
    for (const file of files) {
      const id = createChapterInStore({
        title: titleFromFilename(file.name),
        content: markdownToDoc(file.text),
      });
      firstId ??= id;
    }

    setView('manuscript');
    if (firstId) setActiveChapter(firstId);
    toast({
      tone: 'success',
      title:
        files.length === 1
          ? `Imported “${titleFromFilename(files[0].name)}”`
          : `Imported ${files.length} chapters`,
      body: files.length > 1 ? 'Each file became its own chapter.' : undefined,
    });
    return files.length;
  }, [createChapterInStore, setActiveChapter, setView, toast]);

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
      createChapter,
      goto,
      toggleFocus,
      toggleTheme,
      toggleLibraryPanel,
      toggleDetailsPanel,
      toggleToolbar,
      toggleTypewriterMode,
      toggleSpellcheck,
      toggleMatrixTab,
      openFindReplace,
      newProject,
      duplicateCurrentProject,
      archiveCurrentProject,
      deleteCurrentProject,
      exportProject,
      exportManuscriptAsMarkdown,
      exportManuscriptAsPdf,
      importProject,
      importMarkdownNotes,
      importMarkdownChapters,
      importFolderAsProject,
    }),
    [
      createDoc,
      createFolder,
      createTag,
      createEvent,
      createChapter,
      goto,
      toggleFocus,
      toggleTheme,
      toggleLibraryPanel,
      toggleDetailsPanel,
      toggleToolbar,
      toggleTypewriterMode,
      toggleSpellcheck,
      toggleMatrixTab,
      openFindReplace,
      newProject,
      duplicateCurrentProject,
      archiveCurrentProject,
      deleteCurrentProject,
      exportProject,
      exportManuscriptAsMarkdown,
      exportManuscriptAsPdf,
      importProject,
      importMarkdownNotes,
      importMarkdownChapters,
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
  const nameGuess: Partial<Record<DocKind, string>> = {
    character: 'characters',
    location: 'locations',
    creature: 'creatures',
    tech: 'technology',
    note: 'notes',
  };
  const guess = nameGuess[kind];
  if (!guess) return null;
  const byName = bundle.folders.find((folder) => folder.name.toLowerCase() === guess);
  return byName?.id ?? null;
}
