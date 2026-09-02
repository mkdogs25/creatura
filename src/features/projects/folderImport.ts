import type { Folder, NoteDoc, Project, ProjectBundle } from '@/types/domain';
import { SCHEMA_VERSION } from '@/types/domain';
import { newId } from '@/utils/id';
import { markdownToDoc, titleFromFilename } from '@/utils/markdown';
import { countWords, docToPlainText, makeExcerpt } from '@/utils/text';
import type { PickedFolderFile } from '@/utils/download';

/**
 * Builds a brand-new project from an uploaded folder of markdown files.
 *
 * The folder's own directory structure becomes the project's folder tree.
 * Only directories that actually contain a markdown file — directly or via a
 * descendant — end up as Creatura folders, so a vault's non-markdown clutter
 * (assets, .obsidian, attachments) never creates empty folders; it's simply
 * never visited, because folders are derived from markdown files' paths.
 */
export function buildProjectFromFolder(
  rootName: string,
  files: PickedFolderFile[],
): ProjectBundle {
  const now = Date.now();
  const project: Project = {
    id: newId('project'),
    name: titleFromFilename(rootName) || 'Imported notes',
    description: `Imported from the "${rootName}" folder — ${files.length} ${
      files.length === 1 ? 'note' : 'notes'
    }.`,
    template: 'blank',
    schemaVersion: SCHEMA_VERSION,
    archived: false,
    timelineOrigin: 1,
    timelineUnit: 'chapter',
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };

  const folders: Folder[] = [];
  const folderIdByPath = new Map<string, string>();
  // Separate order namespaces for "subfolders of X" and "notes directly in X"
  // — the two are sorted independently by the tree, but keeping their
  // counters apart avoids confusing shared numbers when reading this data.
  const folderOrder = new Map<string, number>();
  const noteOrder = new Map<string, number>();
  const nextOrder = (counters: Map<string, number>, key: string): number => {
    const order = counters.get(key) ?? 0;
    counters.set(key, order + 1);
    return order;
  };

  const ensureFolder = (segments: string[]): string | null => {
    if (segments.length === 0) return null;
    const path = segments.join('/');
    const existing = folderIdByPath.get(path);
    if (existing) return existing;

    const parentId = ensureFolder(segments.slice(0, -1));
    const folder: Folder = {
      id: newId('folder'),
      projectId: project.id,
      parentId,
      name: segments[segments.length - 1],
      defaultKind: 'note',
      icon: 'file-text',
      color: null,
      order: nextOrder(folderOrder, parentId ?? '__root__'),
      collapsed: false,
      createdAt: now,
      updatedAt: now,
    };
    folders.push(folder);
    folderIdByPath.set(path, folder.id);
    return folder.id;
  };

  const notes: NoteDoc[] = files.map((file, index) => {
    const parts = file.relativePath.split('/').filter(Boolean);
    // The uploaded root folder's own name becomes the project, not a folder
    // inside it — drop that leading segment when one exists.
    const withoutRoot = parts.length > 1 ? parts.slice(1) : parts;
    const folderSegments = withoutRoot.slice(0, -1);
    const filename = withoutRoot[withoutRoot.length - 1] ?? file.relativePath;

    const folderId = ensureFolder(folderSegments);
    const content = markdownToDoc(file.text);
    const text = docToPlainText(content);

    return {
      id: newId('note'),
      projectId: project.id,
      kind: 'note',
      folderId,
      name: titleFromFilename(filename),
      content,
      excerpt: makeExcerpt(text),
      wordCount: countWords(text),
      charCount: text.length,
      tagIds: [],
      fields: [],
      order: nextOrder(noteOrder, folderId ?? '__root__'),
      createdAt: now + index,
      updatedAt: now + index,
    };
  });

  return {
    project,
    folders,
    characters: [],
    locations: [],
    notes,
    tags: [],
    relationships: [],
    events: [],
    sections: [],
    povs: [],
    maps: [],
    markers: [],
    cells: [],
    chapters: [],
  };
}
