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

/** The kinds of writable document that live in the folder tree. `custom`
 * covers every user-defined category — which one is named by `categoryId`
 * on the document itself, since there can be any number of them. */
export type DocKind = 'note' | 'character' | 'location' | 'creature' | 'tech' | 'custom';

/** Everything addressable by a stable id. */
export type EntityKind =
  | DocKind
  | 'folder'
  | 'category'
  | 'tag'
  | 'event'
  | 'pov'
  | 'map'
  | 'marker'
  | 'relationship'
  | 'section'
  | 'project'
  | 'cell'
  | 'chapter'
  | 'terrainStroke'
  | 'stamp';

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

/** A single input field on a Category — the unit both the four built-in
 * categories and any user-defined one are made of. `id` is the stable key a
 * document's `profile` record stores the value under; it survives label
 * edits, and (for the built-in categories) some ids are meaningful to the
 * app itself — see `expandKnownNames` and `applyProfileTagMirrors`. */
export type CategoryFieldType = 'text' | 'textarea';
/** Whether a field's value also becomes a tag: `single` swaps one tag in and
 * out as the value changes (a role, a type); `list` splits a comma/line
 * separated value into several tags, diffed on change (traits, features). */
export type TagMirror = 'none' | 'single' | 'list';

export interface CategoryField {
  id: string;
  label: string;
  type: CategoryFieldType;
  tagMirror: TagMirror;
  hint?: string;
  /** Optional autocomplete values shown in the field's dropdown — a
   * convenience, not a constraint; any value can still be typed. */
  suggestions?: string[];
}

/**
 * A document category: a name, an icon, and the set of structured fields its
 * documents fill in instead of (not alongside — none of these kinds keep a
 * prose editor) free-form prose. Character/Location/Creature/Tech are the
 * four built-in categories, seeded into every project; a project can also
 * define any number of its own. Both kinds are edited the same way, in
 * Settings → Categories — a built-in category's fields are just as editable
 * as a custom one's, only the category itself can't be renamed away or
 * deleted, since Matrix, Timeline and Maps all assume Character and
 * Location specifically exist.
 */
export interface Category {
  id: string;
  projectId: string;
  /** Plural display name — "Characters", "Artifacts". */
  name: string;
  icon: string;
  builtin: boolean;
  fields: CategoryField[];
  order: number;
  createdAt: number;
  updatedAt: number;
}

/** A profile is a flat, dynamic key→value record keyed by `CategoryField.id`
 * — its shape is exactly whatever the doc's category currently defines, so
 * adding, renaming or deleting a field in Settings takes effect immediately
 * without a migration. Missing keys just render as empty. */
export type Profile = Record<string, string>;

export interface CharacterDoc extends BaseDoc {
  kind: 'character';
  profile: Profile;
}

export interface LocationDoc extends BaseDoc {
  kind: 'location';
  /** Optional map this location is depicted on. */
  mapId: string | null;
  profile: Profile;
}

export interface CreatureDoc extends BaseDoc {
  kind: 'creature';
  profile: Profile;
}

export interface TechDoc extends BaseDoc {
  kind: 'tech';
  profile: Profile;
}

/** A document in a user-defined category. `categoryId` names which one,
 * since — unlike the four built-ins — there's no fixed `kind` per category. */
export interface CustomDoc extends BaseDoc {
  kind: 'custom';
  categoryId: string;
  profile: Profile;
}

export interface NoteDoc extends BaseDoc {
  kind: 'note';
}

export type AnyDoc = CharacterDoc | LocationDoc | CreatureDoc | TechDoc | CustomDoc | NoteDoc;

/** The category id a document's profile fields come from — the four
 * built-ins double as their own category id, so only `custom` docs need a
 * separate lookup. Null for notes, which have no category. */
export function categoryIdOf(doc: AnyDoc): string | null {
  if (doc.kind === 'note') return null;
  if (doc.kind === 'custom') return doc.categoryId;
  return doc.kind;
}

/**
 * The four built-in categories' starting field sets — the single source of
 * truth used both when a project is first created (templates, the demo
 * project) and when an existing local database is migrated onto the
 * category system for the first time. Field ids are meaningful, not
 * arbitrary: `character`'s title/firstName/middleName/lastName are read by
 * name (see `expandKnownNames` and `applyProfileTagMirrors`) wherever they
 * still exist in a project's category — deleting one just turns off the
 * behaviour that depended on it, rather than breaking anything.
 */
export function builtinCategories(projectId: string, now: number): Category[] {
  const base = { projectId, builtin: true as const, createdAt: now, updatedAt: now };
  return [
    {
      ...base,
      id: 'character',
      name: 'Characters',
      icon: 'users',
      order: 0,
      fields: [
        { id: 'title', label: 'Title', type: 'text', tagMirror: 'none', suggestions: ['Mr', 'Mrs', 'Ms', 'Mx', 'Dr', 'Professor', 'Captain', 'Sir', 'Lady', 'Lord'] },
        { id: 'firstName', label: 'First name', type: 'text', tagMirror: 'none' },
        { id: 'middleName', label: 'Middle name', type: 'text', tagMirror: 'none' },
        { id: 'lastName', label: 'Last name', type: 'text', tagMirror: 'none' },
        { id: 'role', label: 'Role', type: 'text', tagMirror: 'single', suggestions: ['Protagonist', 'Antagonist', 'Deuteragonist', 'Sidekick', 'Mentor', 'Love Interest', 'Supporting', 'Minor'] },
        { id: 'age', label: 'Age', type: 'text', tagMirror: 'none' },
        { id: 'gender', label: 'Gender', type: 'text', tagMirror: 'none' },
        { id: 'occupation', label: 'Occupation', type: 'text', tagMirror: 'none' },
        { id: 'physicalFeatures', label: 'Physical features', type: 'textarea', tagMirror: 'none', hint: 'Eye colour, hair, height — whatever matters for this one.' },
        { id: 'personalityTraits', label: 'Personality traits', type: 'textarea', tagMirror: 'list', hint: 'Comma- or line-separated — each one becomes a tag.' },
      ],
    },
    {
      ...base,
      id: 'location',
      name: 'Locations',
      icon: 'map-pin',
      order: 1,
      fields: [
        { id: 'type', label: 'Type', type: 'text', tagMirror: 'single', suggestions: ['City', 'Town', 'Village', 'Region', 'Country', 'Building', 'Landmark', 'Wilderness', 'Realm'] },
        { id: 'climate', label: 'Climate', type: 'text', tagMirror: 'none' },
        { id: 'population', label: 'Population', type: 'text', tagMirror: 'none' },
        { id: 'government', label: 'Government', type: 'text', tagMirror: 'none' },
        { id: 'dangerLevel', label: 'Danger level', type: 'text', tagMirror: 'none' },
        { id: 'notableFeatures', label: 'Notable features', type: 'textarea', tagMirror: 'list', hint: 'Comma- or line-separated — each one becomes a tag.' },
        { id: 'atmosphere', label: 'Atmosphere', type: 'textarea', tagMirror: 'none', hint: 'What it feels like to be there.' },
        { id: 'notes', label: 'Notes', type: 'textarea', tagMirror: 'none' },
      ],
    },
    {
      ...base,
      id: 'creature',
      name: 'Creatures',
      icon: 'paw-print',
      order: 2,
      fields: [
        { id: 'species', label: 'Species', type: 'text', tagMirror: 'single', suggestions: ['Beast', 'Monster', 'Familiar', 'Spirit', 'Undead', 'Construct', 'Hybrid', 'Divine'] },
        { id: 'habitat', label: 'Habitat', type: 'text', tagMirror: 'none' },
        { id: 'diet', label: 'Diet', type: 'text', tagMirror: 'none' },
        { id: 'size', label: 'Size', type: 'text', tagMirror: 'none' },
        { id: 'threatLevel', label: 'Threat level', type: 'text', tagMirror: 'none' },
        { id: 'abilities', label: 'Abilities', type: 'textarea', tagMirror: 'list', hint: 'Comma- or line-separated — each one becomes a tag.' },
        { id: 'physicalFeatures', label: 'Physical features', type: 'textarea', tagMirror: 'none', hint: 'Size, colouring, distinguishing marks.' },
        { id: 'notes', label: 'Notes', type: 'textarea', tagMirror: 'none' },
      ],
    },
    {
      ...base,
      id: 'tech',
      name: 'Tech',
      icon: 'cpu',
      order: 3,
      fields: [
        { id: 'category', label: 'Category', type: 'text', tagMirror: 'single', suggestions: ['Weapon', 'Vehicle', 'Device', 'Magic Item', 'Artifact', 'Armor', 'Tool', 'Structure'] },
        { id: 'origin', label: 'Origin', type: 'text', tagMirror: 'none' },
        { id: 'rarity', label: 'Rarity', type: 'text', tagMirror: 'none' },
        { id: 'powerSource', label: 'Power source', type: 'text', tagMirror: 'none' },
        { id: 'function', label: 'Function', type: 'textarea', tagMirror: 'none', hint: 'What it does.' },
        { id: 'properties', label: 'Properties', type: 'textarea', tagMirror: 'list', hint: 'Comma- or line-separated — each one becomes a tag.' },
        { id: 'limitations', label: 'Limitations', type: 'textarea', tagMirror: 'none', hint: "Drawbacks, costs, what it can't do." },
        { id: 'notes', label: 'Notes', type: 'textarea', tagMirror: 'none' },
      ],
    },
  ];
}

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

/** The palette of biomes a terrain brush can paint — see `data/terrainTypes.ts` for color/label. */
export type TerrainKind =
  | 'grass'
  | 'forest'
  | 'water'
  | 'mountain'
  | 'hills'
  | 'sand'
  | 'snow'
  | 'swamp';

/**
 * One freehand brush stroke, painted onto the map as terrain.
 *
 * Stored as its raw path (the pointer's positions while the button was
 * held) rather than a filled polygon, and rendered as a thick, round-capped
 * stroke — vector data that stays a single selectable, movable, resizable,
 * recolorable object, while still reading as a painted swath once several
 * overlap. `order` decides paint order among strokes on the same map, so a
 * later stroke can cover an earlier one the way a real brush would.
 */
export interface MapTerrainStroke {
  id: string;
  projectId: string;
  mapId: string;
  terrain: TerrainKind;
  /** Map-space points the brush passed through, in order. */
  points: Array<{ x: number; y: number }>;
  /** Stroke width in map units. */
  brushSize: number;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * A decorative scenery icon placed on the map — a tree, a ruin, a ship —
 * distinct from a `MapMarker`: a stamp carries no link to a Location and
 * exists purely as art direction for the drawn map, layered above terrain.
 */
export interface MapStamp {
  id: string;
  projectId: string;
  mapId: string;
  /** Id into the built-in icon set — see `data/mapIcons.ts`. */
  icon: string;
  x: number;
  y: number;
  rotation: number;
  /** Multiplier on the icon's base size. */
  scale: number;
  color: string;
  order: number;
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
  /** Left/right padding of the writing column, in pixels. */
  marginX: number;
  paragraphSpacing: number;
  spellcheck: boolean;
  grammarCheck: boolean;
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
  categories: Category[];
  characters: CharacterDoc[];
  locations: LocationDoc[];
  creatures: CreatureDoc[];
  tech: TechDoc[];
  customDocs: CustomDoc[];
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
  terrain: MapTerrainStroke[];
  stamps: MapStamp[];
}

/** Everything belonging to one project, as held in memory by the store. */
export interface ProjectBundle {
  project: Project;
  folders: Folder[];
  categories: Category[];
  characters: CharacterDoc[];
  locations: LocationDoc[];
  creatures: CreatureDoc[];
  tech: TechDoc[];
  customDocs: CustomDoc[];
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
  terrain: MapTerrainStroke[];
  stamps: MapStamp[];
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
