/**
 * Zod schemas for everything Creatura persists.
 *
 * These run at two boundaries: reading records back out of IndexedDB, and
 * importing a project file. Both are places where data can be older than the
 * code or hand-edited, so every schema is written to be forgiving — missing
 * optional fields get defaults rather than rejecting the record outright.
 */
import { z } from 'zod';
import { SCHEMA_VERSION } from '@/types/domain';
import type { RichContent } from '@/types/domain';

const timestamp = z.number().finite().nonnegative();
const id = z.string().min(1);

export const richContentSchema = z
  .object({ type: z.string() })
  .passthrough()
  .catch({ type: 'doc', content: [] }) as unknown as z.ZodType<RichContent>;

export const metaFieldSchema = z.object({
  id: id,
  label: z.string(),
  type: z.enum(['text', 'longtext', 'number', 'select', 'date']).catch('text'),
  value: z.string().catch(''),
  options: z.array(z.string()).optional(),
});

const baseDocShape = {
  id: id,
  projectId: id,
  folderId: id.nullable().catch(null),
  name: z.string().catch('Untitled'),
  content: richContentSchema,
  excerpt: z.string().catch(''),
  wordCount: z.number().int().nonnegative().catch(0),
  charCount: z.number().int().nonnegative().catch(0),
  tagIds: z.array(id).catch([]),
  fields: z.array(metaFieldSchema).catch([]),
  order: z.number().catch(0),
  createdAt: timestamp.catch(() => Date.now()),
  updatedAt: timestamp.catch(() => Date.now()),
};

/** A profile's shape is entirely defined by its category's fields now, so
 * one generic string→string record schema covers every kind — a missing or
 * unrecognised key is simply dropped rather than rejecting the record. */
export const profileSchema = z.record(z.string(), z.string()).catch({});

export const characterSchema = z.object({
  ...baseDocShape,
  kind: z.literal('character').catch('character'),
  profile: profileSchema.default({}),
});

export const locationSchema = z.object({
  ...baseDocShape,
  kind: z.literal('location').catch('location'),
  mapId: id.nullable().catch(null),
  profile: profileSchema.default({}),
});

export const creatureSchema = z.object({
  ...baseDocShape,
  kind: z.literal('creature').catch('creature'),
  profile: profileSchema.default({}),
});

export const techSchema = z.object({
  ...baseDocShape,
  kind: z.literal('tech').catch('tech'),
  profile: profileSchema.default({}),
});

export const customDocSchema = z.object({
  ...baseDocShape,
  kind: z.literal('custom').catch('custom'),
  categoryId: id,
  profile: profileSchema.default({}),
});

export const categoryFieldSchema = z.object({
  id: id,
  label: z.string().catch('Field'),
  type: z.enum(['text', 'textarea']).catch('text'),
  tagMirror: z.enum(['none', 'single', 'list']).catch('none'),
  hint: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

export const categorySchema = z.object({
  id: id,
  projectId: id,
  name: z.string().catch('Category'),
  icon: z.string().catch('folder'),
  builtin: z.boolean().catch(false),
  builtinKind: z.enum(['note', 'character', 'location', 'creature', 'tech', 'custom']).optional(),
  fields: z.array(categoryFieldSchema).catch([]),
  order: z.number().catch(0),
  createdAt: timestamp.catch(() => Date.now()),
  updatedAt: timestamp.catch(() => Date.now()),
});

export const noteSchema = z.object({
  ...baseDocShape,
  kind: z.literal('note').catch('note'),
});

export const folderSchema = z.object({
  id: id,
  projectId: id,
  parentId: id.nullable().catch(null),
  name: z.string().catch('Untitled folder'),
  defaultKind: z.enum(['note', 'character', 'location', 'creature', 'tech']).catch('note'),
  icon: z.string().catch('folder'),
  color: z.string().nullable().catch(null),
  order: z.number().catch(0),
  collapsed: z.boolean().catch(false),
  createdAt: timestamp.catch(() => Date.now()),
  updatedAt: timestamp.catch(() => Date.now()),
});

export const tagSchema = z.object({
  id: id,
  projectId: id,
  name: z.string().catch('tag'),
  color: z.string().catch('#F5B942'),
  createdAt: timestamp.catch(() => Date.now()),
});

export const relationshipSchema = z.object({
  id: id,
  projectId: id,
  fromId: id,
  toId: id,
  type: z.string().catch('Related to'),
  directed: z.boolean().catch(true),
  note: z.string().catch(''),
  createdAt: timestamp.catch(() => Date.now()),
  updatedAt: timestamp.catch(() => Date.now()),
});

export const povSchema = z.object({
  id: id,
  projectId: id,
  name: z.string().catch('POV'),
  characterId: id.nullable().catch(null),
  color: z.string().catch('#F5B942'),
  order: z.number().catch(0),
  visible: z.boolean().catch(true),
});

export const sectionSchema = z
  .object({
    id: id,
    projectId: id,
    name: z.string().catch('Section'),
    kind: z.enum(['era', 'act', 'arc', 'chapter']).catch('era'),
    start: z.number().finite().catch(0),
    end: z.number().finite().catch(10),
    color: z.string().catch('#F5B942'),
    order: z.number().catch(0),
  })
  // A section that ended before it began would render inside-out; nudge it.
  .transform((s) => (s.end > s.start ? s : { ...s, end: s.start + 1 }));

export const eventSchema = z.object({
  id: id,
  projectId: id,
  title: z.string().catch('Untitled event'),
  summary: z.string().catch(''),
  start: z.number().finite().catch(0),
  duration: z.number().finite().nonnegative().catch(1),
  dateLabel: z.string().catch(''),
  povId: id.nullable().catch(null),
  characterIds: z.array(id).catch([]),
  locationIds: z.array(id).catch([]),
  tagIds: z.array(id).catch([]),
  relatedEventIds: z.array(id).catch([]),
  notes: z.string().catch(''),
  color: z.string().nullable().catch(null),
  row: z.number().int().nonnegative().catch(0),
  createdAt: timestamp.catch(() => Date.now()),
  updatedAt: timestamp.catch(() => Date.now()),
});

export const mapSchema = z.object({
  id: id,
  projectId: id,
  name: z.string().catch('Map'),
  width: z.number().positive().catch(1600),
  height: z.number().positive().catch(1000),
  background: z.enum(['grid', 'parchment', 'void', 'image']).catch('parchment'),
  imageData: z.string().nullable().catch(null),
  createdAt: timestamp.catch(() => Date.now()),
  updatedAt: timestamp.catch(() => Date.now()),
});

export const markerSchema = z.object({
  id: id,
  projectId: id,
  mapId: id,
  locationId: id.nullable().catch(null),
  label: z.string().catch('Marker'),
  x: z.number().finite().catch(0),
  y: z.number().finite().catch(0),
  icon: z.string().catch('pin'),
  color: z.string().catch('#F5B942'),
});

export const matrixCellSchema = z.object({
  id: id,
  projectId: id,
  characterId: id,
  locationId: id,
  status: z.string().catch(''),
  note: z.string().catch(''),
  tagIds: z.array(id).catch([]),
  updatedAt: timestamp.catch(() => Date.now()),
});

export const terrainStrokeSchema = z.object({
  id: id,
  projectId: id,
  mapId: id,
  terrain: z
    .enum(['grass', 'forest', 'water', 'mountain', 'hills', 'sand', 'snow', 'swamp'])
    .catch('grass'),
  points: z
    .array(z.object({ x: z.number().finite(), y: z.number().finite() }))
    .catch([]),
  brushSize: z.number().positive().catch(24),
  order: z.number().catch(0),
  createdAt: timestamp.catch(() => Date.now()),
  updatedAt: timestamp.catch(() => Date.now()),
});

export const mapStampSchema = z.object({
  id: id,
  projectId: id,
  mapId: id,
  icon: z.string().catch('tree'),
  x: z.number().finite().catch(0),
  y: z.number().finite().catch(0),
  rotation: z.number().finite().catch(0),
  scale: z.number().positive().catch(1),
  color: z.string().catch('#4F7942'),
  order: z.number().catch(0),
});

export const chapterSchema = z.object({
  id: id,
  projectId: id,
  title: z.string().catch('Untitled chapter'),
  content: richContentSchema,
  excerpt: z.string().catch(''),
  wordCount: z.number().int().nonnegative().catch(0),
  charCount: z.number().int().nonnegative().catch(0),
  order: z.number().catch(0),
  createdAt: timestamp.catch(() => Date.now()),
  updatedAt: timestamp.catch(() => Date.now()),
});

export const projectSchema = z.object({
  id: id,
  name: z.string().catch('Untitled project'),
  description: z.string().catch(''),
  template: z.enum(['fantasy', 'scifi', 'custom', 'blank']).catch('custom'),
  schemaVersion: z.number().int().positive().catch(SCHEMA_VERSION),
  archived: z.boolean().catch(false),
  timelineOrigin: z.number().finite().catch(0),
  timelineUnit: z.enum(['day', 'chapter', 'year']).catch('chapter'),
  createdAt: timestamp.catch(() => Date.now()),
  updatedAt: timestamp.catch(() => Date.now()),
  lastOpenedAt: timestamp.catch(() => Date.now()),
});

export const settingsSchema = z.object({
  id: z.literal('app').catch('app'),
  appearance: z
    .object({
      theme: z.enum(['dark', 'light', 'system']).catch('dark'),
      density: z.enum(['compact', 'comfortable']).catch('comfortable'),
      uiScale: z.number().min(0.85).max(1.3).catch(1),
      animations: z.boolean().catch(true),
      reducedMotion: z.boolean().catch(false),
    })
    .catch({
      theme: 'dark',
      density: 'comfortable',
      uiScale: 1,
      animations: true,
      reducedMotion: false,
    }),
  editor: z
    .object({
      fontFamily: z.enum(['charter', 'inter', 'system-serif', 'mono']).catch('charter'),
      fontSize: z.number().min(13).max(26).catch(18),
      lineHeight: z.number().min(1.2).max(2.4).catch(1.7),
      writingWidth: z.number().min(480).max(1100).catch(720),
      marginX: z.number().min(0).max(160).catch(24),
      paragraphSpacing: z.number().min(0).max(2).catch(0.75),
      spellcheck: z.boolean().catch(true),
      grammarCheck: z.boolean().catch(true),
      showWordCount: z.boolean().catch(true),
      showCharCount: z.boolean().catch(true),
      showToolbar: z.boolean().catch(true),
      typewriterMode: z.boolean().catch(false),
    })
    .catch({
      fontFamily: 'charter',
      fontSize: 18,
      lineHeight: 1.7,
      writingWidth: 720,
      marginX: 24,
      paragraphSpacing: 0.75,
      spellcheck: true,
      grammarCheck: true,
      showWordCount: true,
      showCharCount: true,
      showToolbar: true,
      typewriterMode: false,
    }),
  writing: z
    .object({
      autosave: z.boolean().catch(true),
      autosaveDelay: z.number().min(200).max(5000).catch(700),
      wordGoal: z.number().int().min(0).max(200000).catch(0),
      defaultDocKind: z.enum(['note', 'character', 'location', 'creature', 'tech']).catch('note'),
      smartQuotes: z.boolean().catch(true),
      emDashes: z.boolean().catch(true),
      autoCapitalize: z.boolean().catch(false),
    })
    .catch({
      autosave: true,
      autosaveDelay: 700,
      wordGoal: 0,
      defaultDocKind: 'note',
      smartQuotes: true,
      emDashes: true,
      autoCapitalize: false,
    }),
  interface: z
    .object({
      sidebarDefaultOpen: z.boolean().catch(true),
      metadataDefaultOpen: z.boolean().catch(true),
      leftPanelWidth: z.number().min(200).max(460).catch(272),
      rightPanelWidth: z.number().min(240).max(520).catch(320),
      tooltips: z.boolean().catch(true),
      confirmDestructive: z.boolean().catch(true),
      showMatrixTab: z.boolean().catch(false),
    })
    .catch({
      sidebarDefaultOpen: true,
      metadataDefaultOpen: true,
      leftPanelWidth: 272,
      rightPanelWidth: 320,
      tooltips: true,
      confirmDestructive: true,
      showMatrixTab: false,
    }),
  backup: z
    .object({
      enabled: z.boolean().catch(true),
      intervalMinutes: z.number().min(1).max(5).catch(3),
    })
    .catch({ enabled: true, intervalMinutes: 3 }),
  onboardingComplete: z.boolean().catch(false),
  activeProjectId: z.string().nullable().catch(null),
  lastExportAt: z.number().nullable().catch(null),
});

export const projectExportSchema = z.object({
  format: z.literal('creatura-project'),
  schemaVersion: z.number().int().positive(),
  exportedAt: timestamp.catch(() => Date.now()),
  project: projectSchema,
  folders: z.array(folderSchema).catch([]),
  categories: z.array(categorySchema).catch([]),
  characters: z.array(characterSchema).catch([]),
  locations: z.array(locationSchema).catch([]),
  creatures: z.array(creatureSchema).catch([]),
  tech: z.array(techSchema).catch([]),
  customDocs: z.array(customDocSchema).catch([]),
  notes: z.array(noteSchema).catch([]),
  tags: z.array(tagSchema).catch([]),
  relationships: z.array(relationshipSchema).catch([]),
  events: z.array(eventSchema).catch([]),
  sections: z.array(sectionSchema).catch([]),
  povs: z.array(povSchema).catch([]),
  maps: z.array(mapSchema).catch([]),
  markers: z.array(markerSchema).catch([]),
  cells: z.array(matrixCellSchema).catch([]),
  chapters: z.array(chapterSchema).catch([]),
  terrain: z.array(terrainStrokeSchema).catch([]),
  stamps: z.array(mapStampSchema).catch([]),
});

/**
 * Validates a list of stored records, dropping any that cannot be repaired
 * instead of failing the whole read. One corrupt row must never take down a
 * project.
 */
export function parseAll<S extends z.ZodTypeAny>(
  schema: S,
  rows: unknown[],
  label: string,
): Array<z.infer<S>> {
  const out: Array<z.infer<S>> = [];
  for (const row of rows) {
    const result = schema.safeParse(row);
    if (result.success) {
      out.push(result.data);
    } else if (import.meta.env.DEV) {
      console.warn(`[creatura] discarded unreadable ${label} record`, result.error.issues);
    }
  }
  return out;
}
