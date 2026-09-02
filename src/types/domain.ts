/**
 * Creatura domain model.
 *
 * Every persistent entity carries a stable, prefixed id (`character_ab12…`).
 * The prefix is what lets a reference stored anywhere in the app — an @mention
 * inside prose, a timeline event, a map marker — resolve back to its owner
 * without the referring record needing to know which table it came from.
 */

/** Bumped whenever the persisted shape changes in a way migrations must handle. */
export const SCHEMA_VERSION = 1;

export type ThemeMode = 'dark' | 'light' | 'system';
export type Density = 'compact' | 'comfortable';
export type ViewId = 'library' | 'timeline' | 'manuscript' | 'matrix' | 'settings';

/** The three kinds of writable document that live in the folder tree. */
export type DocKind = 'note' | 'character' | 'location';

/** Everything addressable by a stable id. */
export type EntityKind =
  | DocKind
  | 'folder'
  | 'tag'
  | 'event'
  | 'pov'
  | 'map'
  | 'marker'
  | 'relationship'
  | 'section'
  | 'project'
  | 'cell'
  | 'chapter';

/** Tiptap JSON — kept structurally loose so stored docs never fail to load. */
export interface RichContent {
  type: string;
  content?: unknown[];
  [key: string]: unknown;
}

export type MetaFieldType = 'text' | 'longtext' | 'number' | 'select' | 'date';

export interface MetaField {
  id: string;
  label: string;
  type: MetaFieldType;
  value: string;
  options?: string[];
}

/** Fields shared by every document that can be opened in the writer. */
export interface BaseDoc {
  id: string;
  projectId: string;
  kind: DocKind;
  folderId: string | null;
  name: string;
  content: RichContent;
  /** Flattened plain text, kept in sync on save so search stays cheap. */
  excerpt: string;
  wordCount: number;
  charCount: number;
  tagIds: string[];
  fields: MetaField[];
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface CharacterDoc extends BaseDoc {
  kind: 'character';
}

export interface LocationDoc extends BaseDoc {
  kind: 'location';
  /** Optional map this location is depicted on. */
  mapId: string | null;
}

export interface NoteDoc extends BaseDoc {
  kind: 'note';
}

export type AnyDoc = CharacterDoc | LocationDoc | NoteDoc;

export interface Folder {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  /** Documents created inside this folder default to this kind. */
  defaultKind: DocKind;
  icon: string;
  color: string | null;
  order: number;
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Relationship {
  id: string;
  projectId: string;
  fromId: string;
  toId: string;
  /** Free text: "Friend", "Enemy", "Lives in", "Member of"… */
  type: string;
  /** When false the relationship reads the same in both directions. */
  directed: boolean;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface PointOfView {
  id: string;
  projectId: string;
  name: string;
  characterId: string | null;
  color: string;
  order: number;
  visible: boolean;
}

export type SectionKind = 'era' | 'act' | 'arc' | 'chapter';

/**
 * A named span on the timeline axis. Eras, acts, arcs and chapters are the same
 * shape — they differ only in `kind`, which controls the row they render on.
 */
export interface TimelineSection {
  id: string;
  projectId: string;
  name: string;
  kind: SectionKind;
  /** Inclusive start, in abstract timeline units. */
  start: number;
  /** Exclusive end. Always > start. */
  end: number;
  color: string;
  order: number;
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  /** Position on the abstract axis; see `utils/time.ts` for display mapping. */
  start: number;
  duration: number;
  /** Optional human-authored label shown instead of the computed date. */
  dateLabel: string;
  povId: string | null;
  characterIds: string[];
  locationIds: string[];
  tagIds: string[];
  relatedEventIds: string[];
  notes: string;
  color: string | null;
  /** Vertical offset within a lane, used to stack overlapping events. */
  row: number;
  createdAt: number;
  updatedAt: number;
}

export type MapBackground = 'grid' | 'parchment' | 'void' | 'image';

export interface StoryMap {
  id: string;
  projectId: string;
  name: string;
  width: number;
  height: number;
  background: MapBackground;
  /** Data URL for an uploaded map image, when background === 'image'. */
  imageData: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MapMarker {
  id: string;
  projectId: string;
  mapId: string;
  locationId: string | null;
  label: string;
  /** Map-space coordinates (not screen pixels). */
  x: number;
  y: number;
  icon: string;
  color: string;
}

/**
 * A user-authored annotation on one Character × Location intersection.
 * Everything else shown in a matrix cell is derived from live project data;
 * this record only stores what the author typed there.
 */
export interface MatrixCell {
  id: string;
  projectId: string;
  characterId: string;
  locationId: string;
  status: string;
  note: string;
  tagIds: string[];
  updatedAt: number;
}

/**
 * One chapter of the project's actual manuscript.
 *
 * Deliberately not a DocKind: a chapter doesn't live in the folder tree
 * alongside worldbuilding notes, doesn't carry tags or metadata fields, and
 * is ordered as a flat, reorderable sequence rather than nested — it's the
 * spine of the draft itself, not a piece of reference material about it.
 */
export interface ManuscriptChapter {
  id: string;
  projectId: string;
  title: string;
  content: RichContent;
  excerpt: string;
  wordCount: number;
  charCount: number;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export type TemplateId = 'fantasy' | 'scifi' | 'custom' | 'blank';

export interface Project {
  id: string;
  name: string;
  description: string;
  template: TemplateId;
  schemaVersion: number;
  archived: boolean;
  /** Abstract-axis origin, so timelines can present real-ish dates. */
  timelineOrigin: number;
  timelineUnit: 'day' | 'chapter' | 'year';
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  density: Density;
  /** Root font scale, 0.9–1.25. */
  uiScale: number;
  animations: boolean;
  reducedMotion: boolean;
}

export interface EditorSettings {
  fontFamily: 'charter' | 'inter' | 'system-serif' | 'mono';
  fontSize: number;
  lineHeight: number;
  writingWidth: number;
  paragraphSpacing: number;
  spellcheck: boolean;
  showWordCount: boolean;
  showCharCount: boolean;
  showToolbar: boolean;
  typewriterMode: boolean;
}

export interface WritingSettings {
  autosave: boolean;
  autosaveDelay: number;
  wordGoal: number;
  defaultDocKind: DocKind;
  smartQuotes: boolean;
  emDashes: boolean;
  autoCapitalize: boolean;
}

export interface InterfaceSettings {
  sidebarDefaultOpen: boolean;
  metadataDefaultOpen: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  tooltips: boolean;
  confirmDestructive: boolean;
  /** Matrix View is reachable via ⌘K regardless; this also gives it a tab. */
  showMatrixTab: boolean;
}

/** How often the active project mirrors itself to the connected backup folder. */
export interface BackupSettings {
  enabled: boolean;
  intervalMinutes: number;
}

export interface Settings {
  id: 'app';
  appearance: AppearanceSettings;
  editor: EditorSettings;
  writing: WritingSettings;
  interface: InterfaceSettings;
  backup: BackupSettings;
  onboardingComplete: boolean;
  activeProjectId: string | null;
  lastExportAt: number | null;
}

/** Shape of a `.creatura.json` export file. */
export interface ProjectExport {
  format: 'creatura-project';
  schemaVersion: number;
  exportedAt: number;
  project: Project;
  folders: Folder[];
  characters: CharacterDoc[];
  locations: LocationDoc[];
  notes: NoteDoc[];
  tags: Tag[];
  relationships: Relationship[];
  events: TimelineEvent[];
  sections: TimelineSection[];
  povs: PointOfView[];
  maps: StoryMap[];
  markers: MapMarker[];
  cells: MatrixCell[];
  chapters: ManuscriptChapter[];
}

/** Everything belonging to one project, as held in memory by the store. */
export interface ProjectBundle {
  project: Project;
  folders: Folder[];
  characters: CharacterDoc[];
  locations: LocationDoc[];
  notes: NoteDoc[];
  tags: Tag[];
  relationships: Relationship[];
  events: TimelineEvent[];
  sections: TimelineSection[];
  povs: PointOfView[];
  maps: StoryMap[];
  markers: MapMarker[];
  cells: MatrixCell[];
  chapters: ManuscriptChapter[];
}

/**
 * A point-in-time copy of one document's content.
 *
 * Snapshots are a safety net, not a version-control system: a short ring of
 * recent states per document, taken at intervals rather than per keystroke.
 */
export interface DocSnapshot {
  id: string;
  docId: string;
  projectId: string;
  content: RichContent;
  wordCount: number;
  createdAt: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';
