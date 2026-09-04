import { create } from 'zustand';
import { categoryIdOf } from '@/types/domain';
import type {
  AnyDoc,
  Category,
  CategoryField,
  DocKind,
  Folder,
  ManuscriptChapter,
  MapMarker,
  MapStamp,
  MapTerrainStroke,
  MatrixCell,
  NoteDoc,
  PointOfView,
  Profile,
  Project,
  ProjectBundle,
  Relationship,
  RichContent,
  SectionKind,
  Settings,
  StoryMap,
  Tag,
  TemplateId,
  TerrainKind,
  TimelineEvent,
  TimelineSection,
} from '@/types/domain';
import { type ProjectTableName } from '@/db/database';
import {
  clearProjectContents,
  deleteProjectDeep,
  loadProjectBundle,
  loadProjects,
  putProject,
  saveProjectBundle,
} from '@/db/repositories/projectRepository';
import { deleteDoc as deleteDocRow, putDoc } from '@/db/repositories/docRepository';
import {
  deleteSnapshotsFor,
  deleteSnapshotsForProject,
  maybeSnapshot,
} from '@/db/repositories/snapshotRepository';
import {
  deleteRecord,
  deleteRecords,
  putRecord,
  putRecords,
} from '@/db/repositories/collectionRepository';
import { persistence } from '@/store/persistence';
import { useSettingsStore } from '@/store/settingsStore';
import { useEditorStore } from '@/store/editorStore';
import { kindOfId, newId } from '@/utils/id';
import { colorForKey } from '@/utils/color';
import { countWords, docToLines, docToPlainText, emptyDoc, makeExcerpt } from '@/utils/text';
import { buildProjectFromTemplate } from '@/data/templates';
import { extractProfileFromText } from '@/features/categories/extractProfile';
import { remapEntityReference } from '@/features/mentions/entitySuggestions';

const DOC_TABLE: Record<
  DocKind,
  'characters' | 'locations' | 'creatures' | 'tech' | 'customDocs' | 'notes'
> = {
  character: 'characters',
  location: 'locations',
  creature: 'creatures',
  tech: 'tech',
  custom: 'customDocs',
  note: 'notes',
};

interface CreateProjectInput {
  name: string;
  description: string;
  template: TemplateId;
}

interface ProjectState {
  projects: Project[];
  bundle: ProjectBundle | null;
  loading: boolean;
  dbReady: boolean;
  dbMessage: string | null;

  // ── lifecycle ──────────────────────────────────────────────────────────
  bootstrap: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<string>;
  importBundle: (bundle: ProjectBundle) => Promise<string>;
  openProject: (projectId: string) => Promise<void>;
  updateProject: (patch: Partial<Omit<Project, 'id'>>) => void;
  duplicateProject: (projectId: string) => Promise<string | null>;
  archiveProject: (projectId: string, archived: boolean) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  clearProject: (projectId: string) => Promise<void>;

  // ── documents ──────────────────────────────────────────────────────────
  createDoc: (input: {
    kind: DocKind;
    /** Required when `kind` is `'custom'` — which category it belongs to. */
    categoryId?: string;
    name?: string;
    folderId?: string | null;
    content?: RichContent;
    tagIds?: string[];
  }) => string;
  updateDoc: (docId: string, patch: Partial<AnyDoc>) => void;
  /**
   * Patches a category-backed document's structured profile. Mirrors
   * whichever of its category's fields are tag-mirrored (swapping a single
   * tag, or diffing a comma/line list), and — for characters specifically,
   * as long as the name fields still exist in the category — keeps `name`
   * composed from title/first/middle/last so everything keyed off it (tabs,
   * @mentions, search, the sidebar) stays in sync.
   */
  updateDocProfile: (docId: string, patch: Profile) => void;
  /**
   * Turns an existing note into a document in `categoryId` — built-in or
   * custom. A note has no fixed field shape to move into a category's
   * fixed-table storage, so this creates a fresh, kind-prefixed document
   * (same name, folder, tags) and retires the note, remapping every
   * `@mention`/`[[wiki-link]]` and relationship that pointed at it onto the
   * new id rather than leaving them dangling. "Label: value" lines in the
   * note's prose are extracted into the category's matching fields; returns
   * the new document's id, or null if the note or category can't be found.
   */
  convertDocToCategory: (docId: string, categoryId: string) => string | null;
  updateDocContent: (docId: string, content: RichContent) => void;
  restoreSnapshot: (docId: string, content: RichContent) => void;
  deleteDoc: (docId: string) => void;
  moveDoc: (docId: string, folderId: string | null, order?: number) => void;

  // ── folders ────────────────────────────────────────────────────────────
  createFolder: (input: { name?: string; parentId?: string | null; defaultKind?: DocKind; icon?: string }) => string;
  updateFolder: (folderId: string, patch: Partial<Folder>) => void;
  deleteFolder: (folderId: string) => void;
  moveFolder: (folderId: string, parentId: string | null, order?: number) => void;

  // ── categories ─────────────────────────────────────────────────────────
  /** Creates a new custom category with one starting text field, returning
   * its id. Character/Location/Creature/Tech are seeded once per project
   * and can't be created again or deleted — only their fields change. */
  createCategory: (input: { name: string; icon?: string }) => string;
  updateCategory: (categoryId: string, patch: Partial<Pick<Category, 'name' | 'icon'>>) => void;
  /** Deletes a custom category and every document in it. Refused for a
   * built-in category — Matrix, Timeline and Maps all assume Character and
   * Location specifically exist. */
  deleteCategory: (categoryId: string) => void;
  addCategoryField: (categoryId: string, field: Omit<CategoryField, 'id'>) => void;
  updateCategoryField: (categoryId: string, fieldId: string, patch: Partial<CategoryField>) => void;
  deleteCategoryField: (categoryId: string, fieldId: string) => void;

  // ── tags ───────────────────────────────────────────────────────────────
  createTag: (name: string, color?: string) => string;
  updateTag: (tagId: string, patch: Partial<Tag>) => void;
  deleteTag: (tagId: string) => void;
  toggleDocTag: (docId: string, tagId: string) => void;

  // ── relationships ──────────────────────────────────────────────────────
  createRelationship: (input: Omit<Relationship, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => string;
  updateRelationship: (id: string, patch: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;

  // ── timeline ───────────────────────────────────────────────────────────
  createEvent: (input?: Partial<TimelineEvent>) => string;
  updateEvent: (id: string, patch: Partial<TimelineEvent>) => void;
  deleteEvent: (id: string) => void;
  duplicateEvent: (id: string) => string | null;

  createSection: (input?: Partial<TimelineSection>) => string;
  updateSection: (id: string, patch: Partial<TimelineSection>) => void;
  deleteSection: (id: string) => void;

  createPov: (input?: Partial<PointOfView>) => string;
  updatePov: (id: string, patch: Partial<PointOfView>) => void;
  deletePov: (id: string) => void;

  // ── maps ───────────────────────────────────────────────────────────────
  createMap: (input?: Partial<StoryMap>) => string;
  updateMap: (id: string, patch: Partial<StoryMap>) => void;
  deleteMap: (id: string) => void;
  createMarker: (input: Partial<MapMarker> & { mapId: string; x: number; y: number }) => string;
  updateMarker: (id: string, patch: Partial<MapMarker>) => void;
  deleteMarker: (id: string) => void;
  createTerrainStroke: (
    input: Partial<MapTerrainStroke> & { mapId: string; terrain: TerrainKind; points: Array<{ x: number; y: number }> },
  ) => string;
  updateTerrainStroke: (id: string, patch: Partial<MapTerrainStroke>) => void;
  deleteTerrainStroke: (id: string) => void;
  createStamp: (input: Partial<MapStamp> & { mapId: string; icon: string; x: number; y: number }) => string;
  updateStamp: (id: string, patch: Partial<MapStamp>) => void;
  deleteStamp: (id: string) => void;

  // ── matrix ─────────────────────────────────────────────────────────────
  upsertCell: (characterId: string, locationId: string, patch: Partial<MatrixCell>) => void;
  deleteCell: (id: string) => void;

  // ── manuscript ─────────────────────────────────────────────────────────
  createChapter: (input?: Partial<ManuscriptChapter>) => string;
  updateChapterTitle: (id: string, title: string) => void;
  updateChapterContent: (id: string, content: RichContent) => void;
  restoreChapterSnapshot: (id: string, content: RichContent) => void;
  deleteChapter: (id: string) => void;
  reorderChapter: (id: string, order: number) => void;
  duplicateChapter: (id: string) => string | null;
}

/** Applies a mutation to the in-memory bundle and returns the new bundle. */
function patchBundle(
  state: ProjectState,
  mutate: (bundle: ProjectBundle) => ProjectBundle,
): Partial<ProjectState> {
  if (!state.bundle) return {};
  return { bundle: mutate(state.bundle) };
}

function write(operation: () => Promise<unknown>): void {
  void persistence.run(operation);
}

function touchProject(bundle: ProjectBundle): Project {
  return { ...bundle.project, updatedAt: Date.now() };
}

function nextOrder(items: Array<{ order: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.order), 0) + 1;
}

/** Personality traits are entered as one free-text field, comma- or
 * line-separated, then mirrored into individual tags. */
function splitTraits(value: string): string[] {
  return [...new Set(value.split(/[,\n]/).map((t) => t.trim()).filter(Boolean))];
}

/** A category field's id — internal, never referenced outside its own
 * category, so a short random string is enough (no `newId` entity prefix). */
function randomFieldId(): string {
  return `field-${Math.random().toString(36).slice(2, 10)}`;
}

function makeBaseDoc(
  projectId: string,
  kind: DocKind,
  name: string,
  folderId: string | null,
  order: number,
  content: RichContent,
  tagIds: string[],
  categoryId?: string,
): AnyDoc {
  const text = docToPlainText(content);
  const now = Date.now();
  const base = {
    id: newId(kind),
    projectId,
    folderId,
    name,
    content,
    excerpt: makeExcerpt(text),
    wordCount: countWords(text),
    charCount: text.length,
    tagIds,
    fields: [],
    order,
    createdAt: now,
    updatedAt: now,
  };
  // A profile always starts empty — its shape comes entirely from the
  // doc's category, read live wherever it's rendered, so there's nothing to
  // pre-fill here even for the four built-in kinds.
  if (kind === 'location') return { ...base, kind: 'location', mapId: null, profile: {} } as AnyDoc;
  if (kind === 'character') return { ...base, kind: 'character', profile: {} } as AnyDoc;
  if (kind === 'creature') return { ...base, kind: 'creature', profile: {} } as AnyDoc;
  if (kind === 'tech') return { ...base, kind: 'tech', profile: {} } as AnyDoc;
  if (kind === 'custom')
    return { ...base, kind: 'custom', categoryId: categoryId ?? '', profile: {} } as AnyDoc;
  return { ...base, kind: 'note' } as NoteDoc;
}

export const useProjectStore = create<ProjectState>((set, get) => {
  /** Replaces one document in whichever array holds it. */
  const replaceDoc = (bundle: ProjectBundle, doc: AnyDoc): ProjectBundle => {
    const key = DOC_TABLE[doc.kind];
    const list = bundle[key] as AnyDoc[];
    return {
      ...bundle,
      [key]: list.map((item) => (item.id === doc.id ? doc : item)),
      project: { ...bundle.project, updatedAt: Date.now() },
    } as ProjectBundle;
  };

  const findDoc = (bundle: ProjectBundle, docId: string): AnyDoc | null => {
    const kind = kindOfId(docId);
    if (
      kind !== 'character' &&
      kind !== 'location' &&
      kind !== 'creature' &&
      kind !== 'tech' &&
      kind !== 'custom' &&
      kind !== 'note'
    )
      return null;
    const list = bundle[DOC_TABLE[kind]] as AnyDoc[];
    return list.find((doc) => doc.id === docId) ?? null;
  };

  /** Persists the (already updated) project row alongside a collection write. */
  const writeProjectRow = (bundle: ProjectBundle | null) => {
    if (bundle) void putProject(bundle.project).catch(() => undefined);
  };

  return {
    projects: [],
    bundle: null,
    loading: true,
    dbReady: true,
    dbMessage: null,

    bootstrap: async () => {
      set({ loading: true });
      const projects = await loadProjects();
      const settings = useSettingsStore.getState().settings;
      const wanted =
        settings.activeProjectId && projects.some((p) => p.id === settings.activeProjectId)
          ? settings.activeProjectId
          : projects.find((p) => !p.archived)?.id ?? null;

      if (wanted) {
        const bundle = await loadProjectBundle(wanted);
        set({ projects, bundle, loading: false });
      } else {
        set({ projects, bundle: null, loading: false });
      }
    },

    createProject: async (input) => {
      const bundle = buildProjectFromTemplate(input);
      await persistence.run(() => saveProjectBundle(bundle));
      set((state) => ({
        projects: [bundle.project, ...state.projects],
        bundle,
      }));
      useSettingsStore.getState().update('activeProjectId', bundle.project.id);
      return bundle.project.id;
    },

    importBundle: async (bundle) => {
      await persistence.run(() => saveProjectBundle(bundle));
      set((state) => ({
        projects: [bundle.project, ...state.projects.filter((p) => p.id !== bundle.project.id)],
        bundle,
      }));
      useSettingsStore.getState().update('activeProjectId', bundle.project.id);
      return bundle.project.id;
    },

    openProject: async (projectId) => {
      if (get().bundle?.project.id === projectId) return;
      set({ loading: true });
      const bundle = await loadProjectBundle(projectId);
      if (!bundle) {
        set({ loading: false });
        return;
      }
      const opened: Project = { ...bundle.project, lastOpenedAt: Date.now() };
      const next = { ...bundle, project: opened };
      set((state) => ({
        bundle: next,
        loading: false,
        projects: state.projects.map((p) => (p.id === projectId ? opened : p)),
      }));
      useSettingsStore.getState().update('activeProjectId', projectId);
      write(() => putProject(opened));
    },

    updateProject: (patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const project: Project = { ...bundle.project, ...patch, updatedAt: Date.now() };
      set((state) => ({
        bundle: state.bundle ? { ...state.bundle, project } : null,
        projects: state.projects.map((p) => (p.id === project.id ? project : p)),
      }));
      write(() => putProject(project));
    },

    duplicateProject: async (projectId) => {
      const source = await loadProjectBundle(projectId);
      if (!source) return null;

      // Remap every id so the copy is fully independent, then rewrite each
      // stored reference through the same map — otherwise the duplicate would
      // silently point at the original's records.
      const idMap = new Map<string, string>();
      const remap = (id: string): string => idMap.get(id) ?? id;
      const remapAll = (ids: string[]): string[] => ids.map(remap);

      const register = (id: string) => {
        const kind = kindOfId(id);
        if (kind) idMap.set(id, newId(kind));
      };

      source.folders.forEach((f) => register(f.id));
      source.categories.forEach((c) => register(c.id));
      source.characters.forEach((d) => register(d.id));
      source.locations.forEach((d) => register(d.id));
      source.creatures.forEach((d) => register(d.id));
      source.tech.forEach((d) => register(d.id));
      source.customDocs.forEach((d) => register(d.id));
      source.notes.forEach((d) => register(d.id));
      source.tags.forEach((t) => register(t.id));
      source.relationships.forEach((r) => register(r.id));
      source.events.forEach((e) => register(e.id));
      source.sections.forEach((s) => register(s.id));
      source.povs.forEach((p) => register(p.id));
      source.maps.forEach((m) => register(m.id));
      source.markers.forEach((m) => register(m.id));
      source.cells.forEach((c) => register(c.id));
      source.chapters.forEach((c) => register(c.id));
      source.terrain.forEach((t) => register(t.id));
      source.stamps.forEach((s) => register(s.id));

      const now = Date.now();
      const projectId2 = newId('project');
      const project: Project = {
        ...source.project,
        id: projectId2,
        name: `${source.project.name} copy`,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        archived: false,
      };

      const reDoc = <T extends AnyDoc>(doc: T): T => ({
        ...doc,
        id: remap(doc.id),
        projectId: projectId2,
        folderId: doc.folderId ? remap(doc.folderId) : null,
        tagIds: remapAll(doc.tagIds),
        content: remapContentReferences(doc.content, remap),
      });

      const copy: ProjectBundle = {
        project,
        folders: source.folders.map((f) => ({
          ...f,
          id: remap(f.id),
          projectId: projectId2,
          parentId: f.parentId ? remap(f.parentId) : null,
        })),
        categories: source.categories.map((c) => ({
          ...c,
          id: remap(c.id),
          projectId: projectId2,
        })),
        characters: source.characters.map(reDoc),
        locations: source.locations.map((l) => ({
          ...reDoc(l),
          mapId: l.mapId ? remap(l.mapId) : null,
        })),
        creatures: source.creatures.map(reDoc),
        tech: source.tech.map(reDoc),
        customDocs: source.customDocs.map((d) => ({
          ...reDoc(d),
          categoryId: remap(d.categoryId),
        })),
        notes: source.notes.map(reDoc),
        tags: source.tags.map((t) => ({ ...t, id: remap(t.id), projectId: projectId2 })),
        relationships: source.relationships.map((r) => ({
          ...r,
          id: remap(r.id),
          projectId: projectId2,
          fromId: remap(r.fromId),
          toId: remap(r.toId),
        })),
        events: source.events.map((e) => ({
          ...e,
          id: remap(e.id),
          projectId: projectId2,
          povId: e.povId ? remap(e.povId) : null,
          characterIds: remapAll(e.characterIds),
          locationIds: remapAll(e.locationIds),
          tagIds: remapAll(e.tagIds),
          relatedEventIds: remapAll(e.relatedEventIds),
        })),
        sections: source.sections.map((s) => ({ ...s, id: remap(s.id), projectId: projectId2 })),
        povs: source.povs.map((p) => ({
          ...p,
          id: remap(p.id),
          projectId: projectId2,
          characterId: p.characterId ? remap(p.characterId) : null,
        })),
        maps: source.maps.map((m) => ({ ...m, id: remap(m.id), projectId: projectId2 })),
        markers: source.markers.map((m) => ({
          ...m,
          id: remap(m.id),
          projectId: projectId2,
          mapId: remap(m.mapId),
          locationId: m.locationId ? remap(m.locationId) : null,
        })),
        cells: source.cells.map((c) => ({
          ...c,
          id: remap(c.id),
          projectId: projectId2,
          characterId: remap(c.characterId),
          locationId: remap(c.locationId),
        })),
        chapters: source.chapters.map((c) => ({
          ...c,
          id: remap(c.id),
          projectId: projectId2,
          content: remapContentReferences(c.content, remap),
        })),
        terrain: source.terrain.map((t) => ({
          ...t,
          id: remap(t.id),
          projectId: projectId2,
          mapId: remap(t.mapId),
        })),
        stamps: source.stamps.map((s) => ({
          ...s,
          id: remap(s.id),
          projectId: projectId2,
          mapId: remap(s.mapId),
        })),
      };

      await persistence.run(() => saveProjectBundle(copy));
      set((state) => ({ projects: [project, ...state.projects] }));
      return projectId2;
    },

    archiveProject: async (projectId, archived) => {
      const project = get().projects.find((p) => p.id === projectId);
      if (!project) return;
      const next: Project = { ...project, archived, updatedAt: Date.now() };
      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? next : p)),
        bundle:
          state.bundle?.project.id === projectId
            ? { ...state.bundle, project: next }
            : state.bundle,
      }));
      await persistence.run(() => putProject(next));
    },

    deleteProject: async (projectId) => {
      await persistence.run(async () => {
        await deleteProjectDeep(projectId);
        await deleteSnapshotsForProject(projectId);
      });
      const remaining = get().projects.filter((p) => p.id !== projectId);
      set({ projects: remaining });
      if (get().bundle?.project.id === projectId) {
        const nextProject = remaining.find((p) => !p.archived);
        if (nextProject) {
          const bundle = await loadProjectBundle(nextProject.id);
          set({ bundle });
          useSettingsStore.getState().update('activeProjectId', nextProject.id);
        } else {
          set({ bundle: null });
          useSettingsStore.getState().update('activeProjectId', null);
        }
      }
    },

    clearProject: async (projectId) => {
      await persistence.run(async () => {
        await clearProjectContents(projectId);
        await deleteSnapshotsForProject(projectId);
      });
      if (get().bundle?.project.id === projectId) {
        const bundle = await loadProjectBundle(projectId);
        set({ bundle });
      }
    },

    // ── documents ────────────────────────────────────────────────────────
    createDoc: ({ kind, categoryId, name, folderId = null, content, tagIds = [] }) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      if (kind === 'custom' && !categoryId) return '';
      const list = bundle[DOC_TABLE[kind]] as AnyDoc[];
      const doc = makeBaseDoc(
        bundle.project.id,
        kind,
        name?.trim() || defaultDocName(kind),
        folderId,
        nextOrder(list),
        content ?? emptyDoc(),
        tagIds,
        categoryId,
      );
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          [DOC_TABLE[kind]]: [...(b[DOC_TABLE[kind]] as AnyDoc[]), doc],
          project: touchProject(b),
        }) as ProjectBundle),
      );
      write(() => putDoc(doc));
      writeProjectRow(get().bundle);
      return doc.id;
    },

    convertDocToCategory: (docId, categoryId) => {
      const bundle = get().bundle;
      if (!bundle) return null;
      const current = findDoc(bundle, docId);
      if (!current || current.kind !== 'note') return null;
      const category = bundle.categories.find((c) => c.id === categoryId);
      if (!category) return null;

      const targetKind = category.builtinKind ?? 'custom';
      const list = bundle[DOC_TABLE[targetKind]] as AnyDoc[];
      const next = makeBaseDoc(
        bundle.project.id,
        targetKind,
        current.name,
        current.folderId,
        nextOrder(list),
        current.content,
        current.tagIds,
        categoryId,
      );
      const oldId = current.id;
      const newDocId = next.id;

      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          notes: b.notes
            .filter((note) => note.id !== oldId)
            .map((note) => ({ ...note, content: remapEntityReference(note.content, oldId, newDocId) })),
          chapters: b.chapters.map((chapter) => ({
            ...chapter,
            content: remapEntityReference(chapter.content, oldId, newDocId),
          })),
          relationships: b.relationships.map((rel) =>
            rel.fromId === oldId || rel.toId === oldId
              ? {
                  ...rel,
                  fromId: rel.fromId === oldId ? newDocId : rel.fromId,
                  toId: rel.toId === oldId ? newDocId : rel.toId,
                }
              : rel,
          ),
          [DOC_TABLE[targetKind]]: [...(b[DOC_TABLE[targetKind]] as AnyDoc[]), next],
          project: touchProject(b),
        }) as ProjectBundle),
      );

      write(async () => {
        const after = get().bundle;
        await deleteDocRow(oldId);
        await deleteSnapshotsFor(oldId);
        await putDoc(next);
        if (after) {
          await Promise.all([
            putRecords('notes', after.notes),
            putRecords('chapters', after.chapters),
            putRecords('relationships', after.relationships),
          ]);
        }
      });
      writeProjectRow(get().bundle);

      // Reuse the profile-update path so tag mirroring and character name
      // composition happen exactly as they would for a manual edit.
      const extracted = extractProfileFromText(docToLines(current.content), category.fields);
      if (Object.keys(extracted).length > 0) get().updateDocProfile(newDocId, extracted);

      return newDocId;
    },

    updateDoc: (docId, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = findDoc(bundle, docId);
      if (!current) return;
      const next = { ...current, ...patch, updatedAt: Date.now() } as AnyDoc;
      set((state) => patchBundle(state, (b) => replaceDoc(b, next)));
      write(() => putDoc(next));
    },

    updateDocProfile: (docId, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = findDoc(bundle, docId);
      if (!current || current.kind === 'note') return;

      const categoryId = categoryIdOf(current);
      const category = bundle.categories.find((c) => c.id === categoryId);
      const currentProfile = current.profile;
      const nextProfile: Profile = { ...currentProfile, ...patch };
      let tagIds = current.tagIds;

      const detachTagNamed = (name: string) => {
        const clean = name.trim().toLowerCase();
        if (!clean) return;
        const tag = get().bundle?.tags.find((t) => t.name.toLowerCase() === clean);
        if (tag) tagIds = tagIds.filter((id) => id !== tag.id);
      };
      const attachTagNamed = (name: string) => {
        const clean = name.trim();
        if (!clean) return;
        const id = get().createTag(clean);
        if (id && !tagIds.includes(id)) tagIds = [...tagIds, id];
      };

      // Any field the category marks as tag-mirrored doubles as a quick way
      // to tag the document without leaving the note: `single` swaps one tag
      // out for the new value, `list` diffs a comma/line-separated value
      // into several.
      for (const field of category?.fields ?? []) {
        if (field.tagMirror === 'none' || !(field.id in patch)) continue;
        const oldValue = currentProfile[field.id] ?? '';
        const newValue = patch[field.id] ?? '';
        if (field.tagMirror === 'single') {
          if (newValue !== oldValue) {
            detachTagNamed(oldValue);
            attachTagNamed(newValue);
          }
        } else {
          const oldItems = splitTraits(oldValue);
          const newItems = splitTraits(newValue);
          const newLower = new Set(newItems.map((t) => t.toLowerCase()));
          for (const item of oldItems) {
            if (!newLower.has(item.toLowerCase())) detachTagNamed(item);
          }
          for (const item of newItems) attachTagNamed(item);
        }
      }

      // Characters compose their canonical name from title/first/middle/last
      // whenever those fields are still part of the category — everything
      // keyed off `name` (tabs, @mentions, search, the sidebar) then reads
      // what the profile says rather than drift from it. A project that has
      // deleted those fields just keeps whatever name was typed manually.
      let nextName = current.name;
      if (current.kind === 'character') {
        const nameFieldsTouched = (['firstName', 'middleName', 'lastName'] as const).some(
          (key) => key in patch,
        );
        const composedName = [nextProfile.firstName, nextProfile.middleName, nextProfile.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        if (nameFieldsTouched && composedName) nextName = composedName;
      }

      const next = {
        ...current,
        profile: nextProfile,
        tagIds,
        name: nextName,
        updatedAt: Date.now(),
      } as AnyDoc;
      set((state) => patchBundle(state, (b) => replaceDoc(b, next)));
      write(() => putDoc(next));
    },

    updateDocContent: (docId, content) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = findDoc(bundle, docId);
      if (!current) return;

      const text = docToPlainText(content);
      const next = {
        ...current,
        content,
        excerpt: makeExcerpt(text),
        wordCount: countWords(text),
        charCount: text.length,
        updatedAt: Date.now(),
      } as AnyDoc;
      set((state) => patchBundle(state, (b) => replaceDoc(b, next)));
      write(async () => {
        // Record where the document was before this edit. `maybeSnapshot`
        // rate limits itself, so a long writing session leaves a handful of
        // restore points rather than one per save.
        if (await maybeSnapshot(current)) useEditorStore.getState().noteSnapshotWritten();
        await putDoc(next);
      });
    },

    /**
     * Replaces a document's content with an earlier snapshot. The current
     * content is snapshotted first, so a restore is itself undoable.
     */
    restoreSnapshot: (docId, content) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = findDoc(bundle, docId);
      if (!current) return;

      const text = docToPlainText(content);
      const next = {
        ...current,
        content,
        excerpt: makeExcerpt(text),
        wordCount: countWords(text),
        charCount: text.length,
        updatedAt: Date.now(),
      } as AnyDoc;

      set((state) => patchBundle(state, (b) => replaceDoc(b, next)));
      write(async () => {
        if (await maybeSnapshot(current)) useEditorStore.getState().noteSnapshotWritten();
        await putDoc(next);
      });
    },

    deleteDoc: (docId) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const doc = findDoc(bundle, docId);
      if (!doc) return;
      const key = DOC_TABLE[doc.kind];

      // Sever every reference that pointed at this document. Prose keeps its
      // reference node — it renders as an unresolved token rather than
      // rewriting the author's sentence.
      const staleRelationships = bundle.relationships.filter(
        (rel) => rel.fromId === docId || rel.toId === docId,
      );
      const staleCells = bundle.cells.filter(
        (cell) => cell.characterId === docId || cell.locationId === docId,
      );
      const staleMarkers = bundle.markers.filter((marker) => marker.locationId === docId);

      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          [key]: (b[key] as AnyDoc[]).filter((item) => item.id !== docId),
          relationships: b.relationships.filter(
            (rel) => rel.fromId !== docId && rel.toId !== docId,
          ),
          cells: b.cells.filter(
            (cell) => cell.characterId !== docId && cell.locationId !== docId,
          ),
          markers: b.markers.map((marker) =>
            marker.locationId === docId ? { ...marker, locationId: null } : marker,
          ),
          events: b.events.map((event) =>
            event.characterIds.includes(docId) || event.locationIds.includes(docId)
              ? {
                  ...event,
                  characterIds: event.characterIds.filter((id) => id !== docId),
                  locationIds: event.locationIds.filter((id) => id !== docId),
                }
              : event,
          ),
          povs: b.povs.map((pov) =>
            pov.characterId === docId ? { ...pov, characterId: null } : pov,
          ),
          project: touchProject(b),
        }) as ProjectBundle),
      );

      const after = get().bundle;
      write(async () => {
        await deleteDocRow(docId);
        await deleteSnapshotsFor(docId);
        await deleteRecords('relationships', staleRelationships.map((r) => r.id));
        await deleteRecords('cells', staleCells.map((c) => c.id));
        if (after) {
          await Promise.all([
            ...staleMarkers.map((marker) =>
              putRecord('markers', { ...marker, locationId: null }),
            ),
            ...after.events.map((event) => putRecord('events', event)),
            ...after.povs.map((pov) => putRecord('povs', pov)),
          ]);
        }
      });
    },

    moveDoc: (docId, folderId, order) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const doc = findDoc(bundle, docId);
      if (!doc) return;
      const next = {
        ...doc,
        folderId,
        order: order ?? doc.order,
        updatedAt: Date.now(),
      } as AnyDoc;
      set((state) => patchBundle(state, (b) => replaceDoc(b, next)));
      write(() => putDoc(next));
    },

    // ── folders ──────────────────────────────────────────────────────────
    createFolder: ({ name, parentId = null, defaultKind = 'note', icon = 'folder' }) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const now = Date.now();
      const folder: Folder = {
        id: newId('folder'),
        projectId: bundle.project.id,
        parentId,
        name: name?.trim() || 'New folder',
        defaultKind,
        icon,
        color: null,
        order: nextOrder(bundle.folders.filter((f) => f.parentId === parentId)),
        collapsed: false,
        createdAt: now,
        updatedAt: now,
      };
      set((state) =>
        patchBundle(state, (b) => ({ ...b, folders: [...b.folders, folder] })),
      );
      write(() => putRecord('folders', folder));
      return folder.id;
    },

    updateFolder: (folderId, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.folders.find((f) => f.id === folderId);
      if (!current) return;
      const next: Folder = { ...current, ...patch, updatedAt: Date.now() };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          folders: b.folders.map((f) => (f.id === folderId ? next : f)),
        })),
      );
      write(() => putRecord('folders', next));
    },

    deleteFolder: (folderId) => {
      const bundle = get().bundle;
      if (!bundle) return;

      // Collect the whole subtree so nothing is orphaned in the database.
      const doomed = new Set<string>([folderId]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const folder of bundle.folders) {
          if (folder.parentId && doomed.has(folder.parentId) && !doomed.has(folder.id)) {
            doomed.add(folder.id);
            grew = true;
          }
        }
      }

      const allDocs: AnyDoc[] = [
        ...bundle.characters,
        ...bundle.locations,
        ...bundle.creatures,
        ...bundle.tech,
        ...bundle.customDocs,
        ...bundle.notes,
      ];
      const orphaned = allDocs.filter((doc) => doc.folderId && doomed.has(doc.folderId));

      // Documents survive their folder — they move to the project root so a
      // mis-click can never destroy prose.
      const clearFolder = <T extends { folderId: string | null }>(docs: T[]): T[] =>
        docs.map((d) => (d.folderId && doomed.has(d.folderId) ? { ...d, folderId: null } : d));
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          folders: b.folders.filter((f) => !doomed.has(f.id)),
          characters: clearFolder(b.characters),
          locations: clearFolder(b.locations),
          creatures: clearFolder(b.creatures),
          tech: clearFolder(b.tech),
          customDocs: clearFolder(b.customDocs),
          notes: clearFolder(b.notes),
          project: touchProject(b),
        })),
      );

      write(async () => {
        await deleteRecords('folders', [...doomed]);
        await Promise.all(orphaned.map((doc) => putDoc({ ...doc, folderId: null } as AnyDoc)));
      });
    },

    moveFolder: (folderId, parentId, order) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const folder = bundle.folders.find((f) => f.id === folderId);
      if (!folder) return;

      // Refuse a move that would put a folder inside its own subtree.
      let cursor = parentId;
      while (cursor) {
        if (cursor === folderId) return;
        cursor = bundle.folders.find((f) => f.id === cursor)?.parentId ?? null;
      }

      const next: Folder = {
        ...folder,
        parentId,
        order: order ?? nextOrder(bundle.folders.filter((f) => f.parentId === parentId)),
        updatedAt: Date.now(),
      };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          folders: b.folders.map((f) => (f.id === folderId ? next : f)),
        })),
      );
      write(() => putRecord('folders', next));
    },

    // ── categories ───────────────────────────────────────────────────────
    createCategory: ({ name, icon = 'folder' }) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const now = Date.now();
      const category: Category = {
        id: newId('category'),
        projectId: bundle.project.id,
        name: name.trim() || 'New category',
        icon,
        builtin: false,
        fields: [{ id: randomFieldId(), label: 'Details', type: 'textarea', tagMirror: 'none' }],
        order: nextOrder(bundle.categories),
        createdAt: now,
        updatedAt: now,
      };
      set((state) => patchBundle(state, (b) => ({ ...b, categories: [...b.categories, category] })));
      write(() => putRecord('categories', category));
      return category.id;
    },

    updateCategory: (categoryId, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.categories.find((c) => c.id === categoryId);
      if (!current) return;
      const next: Category = { ...current, ...patch, updatedAt: Date.now() };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          categories: b.categories.map((c) => (c.id === categoryId ? next : c)),
        })),
      );
      write(() => putRecord('categories', next));
    },

    deleteCategory: (categoryId) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const category = bundle.categories.find((c) => c.id === categoryId);
      // Character and Location specifically are assumed to exist by Matrix,
      // Timeline and Maps — only a custom category can be removed outright.
      if (!category || category.builtin) return;

      const doomedDocs = bundle.customDocs.filter((d) => d.categoryId === categoryId);
      const doomedIds = new Set(doomedDocs.map((d) => d.id));
      const staleRelationships = bundle.relationships.filter(
        (r) => doomedIds.has(r.fromId) || doomedIds.has(r.toId),
      );

      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          categories: b.categories.filter((c) => c.id !== categoryId),
          customDocs: b.customDocs.filter((d) => d.categoryId !== categoryId),
          relationships: b.relationships.filter(
            (r) => !doomedIds.has(r.fromId) && !doomedIds.has(r.toId),
          ),
          project: touchProject(b),
        })),
      );

      write(async () => {
        await deleteRecord('categories', categoryId);
        await deleteRecords('customDocs', [...doomedIds]);
        await deleteRecords('relationships', staleRelationships.map((r) => r.id));
        await Promise.all(doomedDocs.map((doc) => deleteSnapshotsFor(doc.id)));
      });
    },

    addCategoryField: (categoryId, field) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.categories.find((c) => c.id === categoryId);
      if (!current) return;
      const next: Category = {
        ...current,
        fields: [...current.fields, { ...field, id: randomFieldId() }],
        updatedAt: Date.now(),
      };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          categories: b.categories.map((c) => (c.id === categoryId ? next : c)),
        })),
      );
      write(() => putRecord('categories', next));
    },

    updateCategoryField: (categoryId, fieldId, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.categories.find((c) => c.id === categoryId);
      if (!current) return;
      const next: Category = {
        ...current,
        fields: current.fields.map((f) => (f.id === fieldId ? { ...f, ...patch, id: f.id } : f)),
        updatedAt: Date.now(),
      };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          categories: b.categories.map((c) => (c.id === categoryId ? next : c)),
        })),
      );
      write(() => putRecord('categories', next));
    },

    deleteCategoryField: (categoryId, fieldId) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.categories.find((c) => c.id === categoryId);
      if (!current) return;
      const next: Category = {
        ...current,
        fields: current.fields.filter((f) => f.id !== fieldId),
        updatedAt: Date.now(),
      };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          categories: b.categories.map((c) => (c.id === categoryId ? next : c)),
        })),
      );
      write(() => putRecord('categories', next));
      // Existing documents' profile[fieldId] values are deliberately left in
      // place — they just stop rendering, rather than being erased outright.
    },

    // ── tags ─────────────────────────────────────────────────────────────
    createTag: (name, color) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const clean = name.trim().replace(/^#/, '');
      if (!clean) return '';
      const existing = bundle.tags.find((t) => t.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing.id;
      const tag: Tag = {
        id: newId('tag'),
        projectId: bundle.project.id,
        name: clean,
        color: color ?? colorForKey(clean),
        createdAt: Date.now(),
      };
      set((state) => patchBundle(state, (b) => ({ ...b, tags: [...b.tags, tag] })));
      write(() => putRecord('tags', tag));
      return tag.id;
    },

    updateTag: (tagId, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.tags.find((t) => t.id === tagId);
      if (!current) return;
      const next = { ...current, ...patch };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          tags: b.tags.map((t) => (t.id === tagId ? next : t)),
        })),
      );
      write(() => putRecord('tags', next));
    },

    deleteTag: (tagId) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const strip = <T extends { tagIds: string[] }>(items: T[]): T[] =>
        items.map((item) =>
          item.tagIds.includes(tagId)
            ? { ...item, tagIds: item.tagIds.filter((id) => id !== tagId) }
            : item,
        );

      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          tags: b.tags.filter((t) => t.id !== tagId),
          characters: strip(b.characters),
          locations: strip(b.locations),
          creatures: strip(b.creatures),
          tech: strip(b.tech),
          customDocs: strip(b.customDocs),
          notes: strip(b.notes),
          events: strip(b.events),
          cells: strip(b.cells),
        })),
      );

      const after = get().bundle;
      write(async () => {
        await deleteRecord('tags', tagId);
        if (!after) return;
        const docs: AnyDoc[] = [
          ...after.characters,
          ...after.locations,
          ...after.creatures,
          ...after.tech,
          ...after.customDocs,
          ...after.notes,
        ];
        await Promise.all([
          ...docs.map((doc) => putDoc(doc)),
          ...after.events.map((event) => putRecord('events', event)),
          ...after.cells.map((cell) => putRecord('cells', cell)),
        ]);
      });
    },

    toggleDocTag: (docId, tagId) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const doc = findDoc(bundle, docId);
      if (!doc) return;
      const tagIds = doc.tagIds.includes(tagId)
        ? doc.tagIds.filter((id) => id !== tagId)
        : [...doc.tagIds, tagId];
      get().updateDoc(docId, { tagIds });
    },

    // ── relationships ────────────────────────────────────────────────────
    createRelationship: (input) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const now = Date.now();
      const relationship: Relationship = {
        ...input,
        id: newId('relationship'),
        projectId: bundle.project.id,
        createdAt: now,
        updatedAt: now,
      };
      set((state) =>
        patchBundle(state, (b) => ({ ...b, relationships: [...b.relationships, relationship] })),
      );
      write(() => putRecord('relationships', relationship));
      return relationship.id;
    },

    updateRelationship: (id, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.relationships.find((r) => r.id === id);
      if (!current) return;
      const next = { ...current, ...patch, updatedAt: Date.now() };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          relationships: b.relationships.map((r) => (r.id === id ? next : r)),
        })),
      );
      write(() => putRecord('relationships', next));
    },

    deleteRelationship: (id) => {
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          relationships: b.relationships.filter((r) => r.id !== id),
        })),
      );
      write(() => deleteRecord('relationships', id));
    },

    // ── timeline ─────────────────────────────────────────────────────────
    createEvent: (input) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const now = Date.now();
      const event: TimelineEvent = {
        id: newId('event'),
        projectId: bundle.project.id,
        title: 'New event',
        summary: '',
        start: 0,
        duration: 1,
        dateLabel: '',
        povId: null,
        characterIds: [],
        locationIds: [],
        tagIds: [],
        relatedEventIds: [],
        notes: '',
        color: null,
        row: 0,
        createdAt: now,
        updatedAt: now,
        ...input,
      };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          events: [...b.events, event],
          project: touchProject(b),
        })),
      );
      write(() => putRecord('events', event));
      return event.id;
    },

    updateEvent: (id, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.events.find((e) => e.id === id);
      if (!current) return;
      const next = { ...current, ...patch, updatedAt: Date.now() };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          events: b.events.map((e) => (e.id === id ? next : e)),
        })),
      );
      write(() => putRecord('events', next));
    },

    deleteEvent: (id) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const referrers = bundle.events.filter((e) => e.relatedEventIds.includes(id));
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          events: b.events
            .filter((e) => e.id !== id)
            .map((e) =>
              e.relatedEventIds.includes(id)
                ? { ...e, relatedEventIds: e.relatedEventIds.filter((r) => r !== id) }
                : e,
            ),
          project: touchProject(b),
        })),
      );
      write(async () => {
        await deleteRecord('events', id);
        await Promise.all(
          referrers.map((event) =>
            putRecord('events', {
              ...event,
              relatedEventIds: event.relatedEventIds.filter((r) => r !== id),
            }),
          ),
        );
      });
    },

    duplicateEvent: (id) => {
      const bundle = get().bundle;
      const source = bundle?.events.find((e) => e.id === id);
      if (!source) return null;
      return get().createEvent({
        ...source,
        id: undefined,
        title: `${source.title} copy`,
        start: source.start + source.duration,
      } as Partial<TimelineEvent>);
    },

    createSection: (input) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const kind: SectionKind = input?.kind ?? 'era';
      const siblings = bundle.sections.filter((s) => s.kind === kind);
      const start = input?.start ?? siblings.reduce((max, s) => Math.max(max, s.end), 0);
      const section: TimelineSection = {
        id: newId('section'),
        projectId: bundle.project.id,
        name: input?.name ?? `New ${kind}`,
        kind,
        start,
        end: input?.end ?? start + 8,
        color: input?.color ?? colorForKey(`${kind}${siblings.length}`),
        order: input?.order ?? nextOrder(siblings),
      };
      set((state) =>
        patchBundle(state, (b) => ({ ...b, sections: [...b.sections, section] })),
      );
      write(() => putRecord('sections', section));
      return section.id;
    },

    updateSection: (id, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.sections.find((s) => s.id === id);
      if (!current) return;
      const merged = { ...current, ...patch };
      const next: TimelineSection =
        merged.end > merged.start ? merged : { ...merged, end: merged.start + 1 };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          sections: b.sections.map((s) => (s.id === id ? next : s)),
        })),
      );
      write(() => putRecord('sections', next));
    },

    deleteSection: (id) => {
      set((state) =>
        patchBundle(state, (b) => ({ ...b, sections: b.sections.filter((s) => s.id !== id) })),
      );
      write(() => deleteRecord('sections', id));
    },

    createPov: (input) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const pov: PointOfView = {
        id: newId('pov'),
        projectId: bundle.project.id,
        name: input?.name ?? 'New POV',
        characterId: input?.characterId ?? null,
        color: input?.color ?? colorForKey(input?.name ?? `pov${bundle.povs.length}`),
        order: input?.order ?? nextOrder(bundle.povs),
        visible: input?.visible ?? true,
      };
      set((state) => patchBundle(state, (b) => ({ ...b, povs: [...b.povs, pov] })));
      write(() => putRecord('povs', pov));
      return pov.id;
    },

    updatePov: (id, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.povs.find((p) => p.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      set((state) =>
        patchBundle(state, (b) => ({ ...b, povs: b.povs.map((p) => (p.id === id ? next : p)) })),
      );
      write(() => putRecord('povs', next));
    },

    deletePov: (id) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const affected = bundle.events.filter((e) => e.povId === id);
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          povs: b.povs.filter((p) => p.id !== id),
          events: b.events.map((e) => (e.povId === id ? { ...e, povId: null } : e)),
        })),
      );
      write(async () => {
        await deleteRecord('povs', id);
        await Promise.all(
          affected.map((event) => putRecord('events', { ...event, povId: null })),
        );
      });
    },

    // ── maps ─────────────────────────────────────────────────────────────
    createMap: (input) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const now = Date.now();
      const map: StoryMap = {
        id: newId('map'),
        projectId: bundle.project.id,
        name: input?.name ?? 'New map',
        width: input?.width ?? 1600,
        height: input?.height ?? 1000,
        background: input?.background ?? 'parchment',
        imageData: input?.imageData ?? null,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => patchBundle(state, (b) => ({ ...b, maps: [...b.maps, map] })));
      write(() => putRecord('maps', map));
      return map.id;
    },

    updateMap: (id, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.maps.find((m) => m.id === id);
      if (!current) return;
      const next = { ...current, ...patch, updatedAt: Date.now() };
      set((state) =>
        patchBundle(state, (b) => ({ ...b, maps: b.maps.map((m) => (m.id === id ? next : m)) })),
      );
      write(() => putRecord('maps', next));
    },

    deleteMap: (id) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const markerIds = bundle.markers.filter((m) => m.mapId === id).map((m) => m.id);
      const terrainIds = bundle.terrain.filter((t) => t.mapId === id).map((t) => t.id);
      const stampIds = bundle.stamps.filter((s) => s.mapId === id).map((s) => s.id);
      const detached = bundle.locations.filter((l) => l.mapId === id);
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          maps: b.maps.filter((m) => m.id !== id),
          markers: b.markers.filter((m) => m.mapId !== id),
          terrain: b.terrain.filter((t) => t.mapId !== id),
          stamps: b.stamps.filter((s) => s.mapId !== id),
          locations: b.locations.map((l) => (l.mapId === id ? { ...l, mapId: null } : l)),
        })),
      );
      write(async () => {
        await deleteRecord('maps', id);
        await deleteRecords('markers', markerIds);
        await deleteRecords('terrain', terrainIds);
        await deleteRecords('stamps', stampIds);
        await Promise.all(detached.map((l) => putDoc({ ...l, mapId: null })));
      });
    },

    createMarker: (input) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const marker: MapMarker = {
        id: newId('marker'),
        projectId: bundle.project.id,
        mapId: input.mapId,
        locationId: input.locationId ?? null,
        label: input.label ?? 'New marker',
        x: input.x,
        y: input.y,
        icon: input.icon ?? 'pin',
        color: input.color ?? '#F5B942',
      };
      set((state) => patchBundle(state, (b) => ({ ...b, markers: [...b.markers, marker] })));
      write(() => putRecord('markers', marker));
      return marker.id;
    },

    updateMarker: (id, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.markers.find((m) => m.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          markers: b.markers.map((m) => (m.id === id ? next : m)),
        })),
      );
      write(() => putRecord('markers', next));
    },

    deleteMarker: (id) => {
      set((state) =>
        patchBundle(state, (b) => ({ ...b, markers: b.markers.filter((m) => m.id !== id) })),
      );
      write(() => deleteRecord('markers', id));
    },

    createTerrainStroke: (input) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const now = Date.now();
      const onMap = bundle.terrain.filter((t) => t.mapId === input.mapId);
      const stroke: MapTerrainStroke = {
        id: newId('terrainStroke'),
        projectId: bundle.project.id,
        mapId: input.mapId,
        terrain: input.terrain,
        points: input.points,
        brushSize: input.brushSize ?? 24,
        // Painted last, so it renders over anything already on this map.
        order: input.order ?? onMap.length,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => patchBundle(state, (b) => ({ ...b, terrain: [...b.terrain, stroke] })));
      write(() => putRecord('terrain', stroke));
      return stroke.id;
    },

    updateTerrainStroke: (id, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.terrain.find((t) => t.id === id);
      if (!current) return;
      const next = { ...current, ...patch, updatedAt: Date.now() };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          terrain: b.terrain.map((t) => (t.id === id ? next : t)),
        })),
      );
      write(() => putRecord('terrain', next));
    },

    deleteTerrainStroke: (id) => {
      set((state) =>
        patchBundle(state, (b) => ({ ...b, terrain: b.terrain.filter((t) => t.id !== id) })),
      );
      write(() => deleteRecord('terrain', id));
    },

    createStamp: (input) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const onMap = bundle.stamps.filter((s) => s.mapId === input.mapId);
      const stamp: MapStamp = {
        id: newId('stamp'),
        projectId: bundle.project.id,
        mapId: input.mapId,
        icon: input.icon,
        x: input.x,
        y: input.y,
        rotation: input.rotation ?? 0,
        scale: input.scale ?? 1,
        color: input.color ?? '#4F7942',
        order: input.order ?? onMap.length,
      };
      set((state) => patchBundle(state, (b) => ({ ...b, stamps: [...b.stamps, stamp] })));
      write(() => putRecord('stamps', stamp));
      return stamp.id;
    },

    updateStamp: (id, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.stamps.find((s) => s.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      set((state) =>
        patchBundle(state, (b) => ({ ...b, stamps: b.stamps.map((s) => (s.id === id ? next : s)) })),
      );
      write(() => putRecord('stamps', next));
    },

    deleteStamp: (id) => {
      set((state) =>
        patchBundle(state, (b) => ({ ...b, stamps: b.stamps.filter((s) => s.id !== id) })),
      );
      write(() => deleteRecord('stamps', id));
    },

    // ── matrix ───────────────────────────────────────────────────────────
    upsertCell: (characterId, locationId, patch) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const existing = bundle.cells.find(
        (c) => c.characterId === characterId && c.locationId === locationId,
      );
      const next: MatrixCell = existing
        ? { ...existing, ...patch, updatedAt: Date.now() }
        : {
            id: newId('cell'),
            projectId: bundle.project.id,
            characterId,
            locationId,
            status: '',
            note: '',
            tagIds: [],
            ...patch,
            updatedAt: Date.now(),
          };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          cells: existing
            ? b.cells.map((c) => (c.id === next.id ? next : c))
            : [...b.cells, next],
        })),
      );
      write(() => putRecord('cells', next));
    },

    deleteCell: (id) => {
      set((state) =>
        patchBundle(state, (b) => ({ ...b, cells: b.cells.filter((c) => c.id !== id) })),
      );
      write(() => deleteRecord('cells', id));
    },

    // ── manuscript ───────────────────────────────────────────────────────
    createChapter: (input) => {
      const bundle = get().bundle;
      if (!bundle) return '';
      const now = Date.now();
      const chapter: ManuscriptChapter = {
        id: newId('chapter'),
        projectId: bundle.project.id,
        title: 'Untitled chapter',
        content: emptyDoc(),
        excerpt: '',
        wordCount: 0,
        charCount: 0,
        order: nextOrder(bundle.chapters),
        createdAt: now,
        updatedAt: now,
        ...input,
      };
      set((state) =>
        patchBundle(state, (b) => ({ ...b, chapters: [...b.chapters, chapter] })),
      );
      write(() => putRecord('chapters', chapter));
      return chapter.id;
    },

    updateChapterTitle: (id, title) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.chapters.find((c) => c.id === id);
      if (!current) return;
      const next = { ...current, title: title.trim() || 'Untitled chapter', updatedAt: Date.now() };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          chapters: b.chapters.map((c) => (c.id === id ? next : c)),
        })),
      );
      write(() => putRecord('chapters', next));
    },

    updateChapterContent: (id, content) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.chapters.find((c) => c.id === id);
      if (!current) return;
      const text = docToPlainText(content);
      const next: ManuscriptChapter = {
        ...current,
        content,
        excerpt: makeExcerpt(text),
        wordCount: countWords(text),
        charCount: text.length,
        updatedAt: Date.now(),
      };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          chapters: b.chapters.map((c) => (c.id === id ? next : c)),
        })),
      );
      write(async () => {
        if (await maybeSnapshot(current)) useEditorStore.getState().noteSnapshotWritten();
        await putRecord('chapters', next);
      });
    },

    restoreChapterSnapshot: (id, content) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const current = bundle.chapters.find((c) => c.id === id);
      if (!current) return;
      const text = docToPlainText(content);
      const next: ManuscriptChapter = {
        ...current,
        content,
        excerpt: makeExcerpt(text),
        wordCount: countWords(text),
        charCount: text.length,
        updatedAt: Date.now(),
      };
      set((state) =>
        patchBundle(state, (b) => ({
          ...b,
          chapters: b.chapters.map((c) => (c.id === id ? next : c)),
        })),
      );
      write(async () => {
        await maybeSnapshot(current);
        await putRecord('chapters', next);
      });
    },

    deleteChapter: (id) => {
      set((state) =>
        patchBundle(state, (b) => ({ ...b, chapters: b.chapters.filter((c) => c.id !== id) })),
      );
      write(async () => {
        await deleteRecord('chapters', id);
        await deleteSnapshotsFor(id);
      });
    },

    reorderChapter: (id, order) => {
      const bundle = get().bundle;
      if (!bundle) return;
      const moving = bundle.chapters.find((c) => c.id === id);
      if (!moving) return;

      // Standard "reinsert at position" reorder: pull the chapter out, splice
      // it back in at the target index, then renumber everything so `order`
      // always stays a dense, gap-free sequence.
      const rest = bundle.chapters.filter((c) => c.id !== id).sort((a, b) => a.order - b.order);
      const clampedIndex = Math.max(0, Math.min(order, rest.length));
      rest.splice(clampedIndex, 0, moving);
      const reordered = rest.map((chapter, index) => ({ ...chapter, order: index }));

      set((state) => patchBundle(state, (b) => ({ ...b, chapters: reordered })));
      write(() => putRecords('chapters', reordered));
    },

    duplicateChapter: (id) => {
      const bundle = get().bundle;
      const source = bundle?.chapters.find((c) => c.id === id);
      if (!source) return null;
      return get().createChapter({
        ...source,
        id: undefined,
        title: `${source.title} copy`,
        order: source.order + 1,
      } as Partial<ManuscriptChapter>);
    },
  };
});

function defaultDocName(kind: DocKind): string {
  if (kind === 'character') return 'New character';
  if (kind === 'location') return 'New location';
  if (kind === 'creature') return 'New creature';
  if (kind === 'tech') return 'New tech';
  if (kind === 'custom') return 'New entry';
  return 'Untitled note';
}

/** Rewrites entity-reference ids inside a Tiptap document (used by duplicate). */
function remapContentReferences(
  content: RichContent,
  remap: (id: string) => string,
): RichContent {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const n = node as Record<string, unknown>;
    const next: Record<string, unknown> = { ...n };
    if (n.type === 'entityReference' && n.attrs && typeof n.attrs === 'object') {
      const attrs = n.attrs as Record<string, unknown>;
      if (typeof attrs.entityId === 'string') {
        next.attrs = { ...attrs, entityId: remap(attrs.entityId) };
      }
    }
    if (Array.isArray(n.content)) next.content = n.content.map(walk);
    return next;
  };
  return walk(content) as RichContent;
}

/** Table name for a project-scoped collection, exported for the export routine. */
export const PROJECT_COLLECTIONS: ProjectTableName[] = [
  'folders',
  'categories',
  'characters',
  'locations',
  'creatures',
  'tech',
  'customDocs',
  'notes',
  'tags',
  'relationships',
  'events',
  'sections',
  'povs',
  'maps',
  'markers',
  'cells',
];

export type { Settings };
