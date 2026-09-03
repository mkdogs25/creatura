import type { AnyDoc, Folder, ProjectBundle } from '@/types/domain';
import { docToMarkdown } from '@/utils/markdownExport';
import { mapToSvg } from '@/lib/mapToSvg';

function sanitizeFilename(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ');
  return cleaned.length > 0 ? cleaned.slice(0, 120) : 'Untitled';
}

/** Empties a directory before a fresh backup pass, so renames/deletes never leave orphans behind. */
async function clearDirectory(dir: FileSystemDirectoryHandle): Promise<void> {
  const names: string[] = [];
  for await (const name of dir.keys()) names.push(name);
  await Promise.all(
    names.map((name) => dir.removeEntry(name, { recursive: true }).catch(() => undefined)),
  );
}

async function writeTextFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  contents: string,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

function yamlScalar(value: string): string {
  if (value === '' || value !== value.trim() || /[:#[\]{}]/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function frontmatter(fields: Record<string, string | string[] | number>): string {
  const lines = Object.entries(fields).map(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return `${key}: []`;
      return `${key}:\n${value.map((v) => `  - ${yamlScalar(v)}`).join('\n')}`;
    }
    return `${key}: ${typeof value === 'number' ? value : yamlScalar(value)}`;
  });
  return `---\n${lines.join('\n')}\n---\n\n`;
}

/** Guards against two docs in the same folder sharing a filename after sanitizing. */
function nameAllocator() {
  const used = new WeakMap<FileSystemDirectoryHandle, Set<string>>();
  return (dir: FileSystemDirectoryHandle, base: string, ext: string): string => {
    const taken = used.get(dir) ?? new Set<string>();
    used.set(dir, taken);
    let candidate = `${base}${ext}`;
    for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) {
      candidate = `${base} (${n})${ext}`;
    }
    taken.add(candidate.toLowerCase());
    return candidate;
  };
}

/**
 * Mirrors a project onto disk under `root`, in a subfolder named after it.
 * Two layers of the same data, both written every pass:
 *
 * - `project.json`: the whole bundle, verbatim — the fidelity-preserving
 *   copy, since plain markdown can't hold tags, relationships, the timeline
 *   or the matrix.
 * - A human-readable tree matching the project's own folder structure:
 *   characters/locations/notes as markdown (with a small YAML frontmatter
 *   block for id/kind/tags), manuscript chapters as ordered markdown in
 *   `Manuscript/`, and maps as standalone SVG in `Maps/`.
 *
 * The project folder is cleared before each pass rather than diffed, so a
 * rename or delete since the last backup can never leave a stale file
 * behind — this is a mirror, not a sync log.
 */
export async function writeProjectBackup(
  root: FileSystemDirectoryHandle,
  bundle: ProjectBundle,
): Promise<void> {
  const projectDirName = sanitizeFilename(
    `${bundle.project.name} (${bundle.project.id.slice(-6)})`,
  );
  const projectDir = await root.getDirectoryHandle(projectDirName, { create: true });
  await clearDirectory(projectDir);

  await writeTextFile(projectDir, 'project.json', JSON.stringify(bundle, null, 2));

  const uniqueName = nameAllocator();
  const tagNameById = new Map(bundle.tags.map((tag) => [tag.id, tag.name]));
  const allDocs: AnyDoc[] = [
    ...bundle.characters,
    ...bundle.locations,
    ...bundle.creatures,
    ...bundle.tech,
    ...bundle.notes,
  ];
  const nameById = new Map(allDocs.map((doc) => [doc.id, doc.name]));
  const resolveEntity = (entityId: string, fallback: string) => nameById.get(entityId) ?? fallback;

  // Recreate the project's own folder tree as real directories.
  const dirByFolderId = new Map<string, FileSystemDirectoryHandle>();
  const childrenByParent = new Map<string | null, Folder[]>();
  for (const folder of bundle.folders) {
    const list = childrenByParent.get(folder.parentId) ?? [];
    list.push(folder);
    childrenByParent.set(folder.parentId, list);
  }
  const buildFolders = async (parentId: string | null, parentDir: FileSystemDirectoryHandle) => {
    const children = (childrenByParent.get(parentId) ?? []).sort((a, b) => a.order - b.order);
    for (const folder of children) {
      const name = uniqueName(parentDir, sanitizeFilename(folder.name), '');
      const dir = await parentDir.getDirectoryHandle(name || 'Untitled folder', { create: true });
      dirByFolderId.set(folder.id, dir);
      await buildFolders(folder.id, dir);
    }
  };
  await buildFolders(null, projectDir);

  for (const doc of allDocs) {
    const dir = (doc.folderId && dirByFolderId.get(doc.folderId)) || projectDir;
    const fm = frontmatter({
      id: doc.id,
      kind: doc.kind,
      tags: doc.tagIds.map((id) => tagNameById.get(id) ?? id),
      updated: new Date(doc.updatedAt).toISOString(),
    });
    const filename = uniqueName(dir, sanitizeFilename(doc.name), '.md');
    await writeTextFile(dir, filename, `${fm}${docToMarkdown(doc.content, resolveEntity)}\n`);
  }

  if (bundle.chapters.length > 0) {
    const manuscriptDir = await projectDir.getDirectoryHandle('Manuscript', { create: true });
    const ordered = [...bundle.chapters].sort((a, b) => a.order - b.order);
    for (const [index, chapter] of ordered.entries()) {
      const fm = frontmatter({
        id: chapter.id,
        order: index + 1,
        updated: new Date(chapter.updatedAt).toISOString(),
      });
      const base = `${String(index + 1).padStart(2, '0')} - ${sanitizeFilename(chapter.title)}`;
      const filename = uniqueName(manuscriptDir, base, '.md');
      await writeTextFile(
        manuscriptDir,
        filename,
        `${fm}${docToMarkdown(chapter.content, resolveEntity)}\n`,
      );
    }
  }

  if (bundle.maps.length > 0) {
    const mapsDir = await projectDir.getDirectoryHandle('Maps', { create: true });
    const groupByMap = <T extends { mapId: string }>(rows: T[]): Map<string, T[]> => {
      const grouped = new Map<string, T[]>();
      for (const row of rows) {
        const list = grouped.get(row.mapId) ?? [];
        list.push(row);
        grouped.set(row.mapId, list);
      }
      return grouped;
    };
    const markersByMap = groupByMap(bundle.markers);
    const terrainByMap = groupByMap(bundle.terrain);
    const stampsByMap = groupByMap(bundle.stamps);
    const locationNameById = new Map(bundle.locations.map((loc) => [loc.id, loc.name]));
    for (const map of bundle.maps) {
      const markers = markersByMap.get(map.id) ?? [];
      const svg = mapToSvg(
        map,
        markers,
        (marker) =>
          marker.label ||
          (marker.locationId && locationNameById.get(marker.locationId)) ||
          'Marker',
        terrainByMap.get(map.id) ?? [],
        stampsByMap.get(map.id) ?? [],
      );
      const filename = uniqueName(mapsDir, sanitizeFilename(map.name), '.svg');
      await writeTextFile(mapsDir, filename, svg);
    }
  }
}
