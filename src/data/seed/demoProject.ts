import type {
  CharacterDoc,
  CreatureDoc,
  LocationDoc,
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
  StoryMap,
  Tag,
  TechDoc,
  TimelineEvent,
  TimelineSection,
} from '@/types/domain';
import { SCHEMA_VERSION, builtinCategories } from '@/types/domain';
import { newId } from '@/utils/id';
import { countWords, docToPlainText, makeExcerpt } from '@/utils/text';
import { materializeFolders, templateById } from '@/data/templates';

/**
 * "Tidewrack" — the demo world.
 *
 * This file is only data. The builder below assigns real ids and wires the
 * cross-references, so the demo lands in IndexedDB as an ordinary project the
 * author can edit or delete like any other. Nothing in the application special
 * cases it.
 */

type Key = string;

interface DocSpec {
  key: Key;
  name: string;
  folder: string;
  tags?: string[];
  fields?: Array<[label: string, value: string]>;
  /** The structured profile fields, keyed by the relevant category's field
   * ids (see `builtinCategories`). */
  profile?: Profile;
  /** Paragraphs; `@key` inside a paragraph becomes an entity reference node. */
  body: string[];
}

const CHARACTERS: DocSpec[] = [
  {
    key: 'elysia',
    name: 'Elysia Ambrose',
    folder: 'Characters',
    tags: ['Protagonist', 'Lanternwright'],
    fields: [
      ['Status', 'Alive'],
      ['Age', '29'],
      ['Role', 'Lanternwright of the Quay'],
      ['First Appearance', 'The Festival of Low Water'],
      ['Importance', 'Primary'],
      ['Affiliation', 'The Order of the Tide'],
    ],
    profile: {
      firstName: 'Elysia',
      lastName: 'Ambrose',
      role: 'Protagonist',
      age: '29',
      gender: 'Woman',
      occupation: 'Lanternwright',
      physicalFeatures: 'Weather-cracked hands, a Northlands accent she never lost, a permanent squint from watching lanterns at night.',
      personalityTraits: 'Stubborn, dutiful, quietly resentful',
    },
    body: [
      'Elysia keeps the harbour lanterns burning, which is a smaller job than it sounds and a larger one than anybody in @glasscity admits. Twice a night she walks the seawall with a hooked pole and a tin of blue oil, and twice a night she counts the lights of ships that have no business being where they are.',
      'She was born in @northlands, in a valley where the word for "ocean" was borrowed from a neighbouring language. She has never entirely lost the accent, and she has never entirely stopped resenting the people who notice it.',
      'What she wants is unglamorous: to be permitted to keep doing her work, in her city, without the Order deciding her name is useful to them. What she gets is @kael, arriving on the last tide before the festival with a sealed writ and an apology already prepared.',
    ],
  },
  {
    key: 'kael',
    name: 'Kael Vantress',
    folder: 'Characters',
    tags: ['Antagonist', 'The Order'],
    fields: [
      ['Status', 'Alive'],
      ['Age', '41'],
      ['Role', 'Writ-bearer'],
      ['First Appearance', 'The Writ Arrives'],
      ['Importance', 'Primary'],
      ['Affiliation', 'The Order of the Tide'],
    ],
    profile: {
      firstName: 'Kael',
      lastName: 'Vantress',
      role: 'Antagonist',
      age: '41',
      gender: 'Man',
      occupation: 'Writ-bearer',
      physicalFeatures: 'Tall, grey at the temples, a writ-case he never sets down.',
      personalityTraits: 'Principled, weary, self-doubting',
    },
    body: [
      'Kael is not cruel, which is the difficulty. He believes the Order is the only institution standing between @glasscity and a sea that has already taken three coastlines this century, and he is very nearly right.',
      'He carries writs the way other men carry knives — reluctantly, visibly, and with the understanding that drawing one ends the conversation. The writ he brings for @elysia is the first he has ever hesitated over.',
      'He and @mira were students together, before the Order and the archive drew a line down the middle of their generation.',
    ],
  },
  {
    key: 'mira',
    name: 'Mira Solane',
    folder: 'Characters',
    tags: ['Ally', 'Archivist'],
    fields: [
      ['Status', 'Alive'],
      ['Age', '38'],
      ['Role', 'Keeper of the Drowned Stair'],
      ['First Appearance', 'The Festival of Low Water'],
      ['Importance', 'Primary'],
      ['Affiliation', 'The Tidal Archive'],
    ],
    profile: {
      firstName: 'Mira',
      lastName: 'Solane',
      role: 'Ally',
      age: '38',
      gender: 'Woman',
      occupation: 'Archivist',
      physicalFeatures: 'Ink-stained fingers, keeps her hair short so it never drags in the flooded stacks.',
      personalityTraits: 'Meticulous, dry-humoured, fiercely loyal',
    },
    body: [
      'Mira catalogues a library that floods twice a day. Everything below the fourth landing of @drownedstair is copied, re-copied, and copied again, and she has come to think of the archive less as a building than as a rumour the city keeps repeating to itself.',
      'She has known @elysia since both of them were too young to be trusted with open flame. She is the only person who calls her Ambrose.',
    ],
  },
  {
    key: 'elian',
    name: 'Elian Rouke',
    folder: 'Characters',
    tags: ['Supporting'],
    fields: [
      ['Status', 'Missing'],
      ['Age', '23'],
      ['Role', 'Ferrier'],
      ['Importance', 'Secondary'],
    ],
    profile: {
      firstName: 'Elian',
      lastName: 'Rouke',
      role: 'Supporting',
      age: '23',
      gender: 'Man',
      occupation: 'Ferrier',
      physicalFeatures: 'Wiry, sun-browned, a scar across one knuckle from a boat hook.',
      personalityTraits: 'Discreet, superstitious',
    },
    body: [
      'Elian ferries the sunken quarter at low water and pretends not to notice what his passengers carry. He was last seen poling north out of @lanternquay on the night of the assassination, and the boat came back without him.',
    ],
  },
  {
    key: 'oduya',
    name: 'Warden Oduya',
    folder: 'Characters',
    tags: ['Supporting', 'The Order'],
    fields: [
      ['Status', 'Alive'],
      ['Role', 'Harbour Warden'],
      ['Importance', 'Secondary'],
      ['Affiliation', 'Harbour Watch'],
    ],
    // Title + surname, no first name on record — exactly the shape that
    // used to read as a stranger every time the prose said "the Warden"
    // instead of the full "Warden Oduya".
    profile: {
      title: 'Warden',
      lastName: 'Oduya',
      role: 'Supporting',
      occupation: 'Harbour Warden',
      physicalFeatures: 'Weathered, broad-shouldered, a Harbour Watch coat gone thin at the elbows.',
      personalityTraits: 'Superstitious, dependable',
    },
    body: [
      'Thirty years on the seawall have left the Warden with an unshakeable conviction that the tide is a person, and a grudging respect for anyone who works nights.',
    ],
  },
];

const LOCATIONS: DocSpec[] = [
  {
    key: 'glasscity',
    name: 'Glass City',
    folder: 'Locations',
    tags: ['Capital'],
    fields: [
      ['Status', 'Standing'],
      ['Region', 'The Wrack Coast'],
      ['Population', '~80,000'],
    ],
    profile: {
      type: 'City',
      climate: 'Temperate, humid',
      population: '~80,000',
      government: 'The Order of the Tide',
      dangerLevel: 'Moderate — the tide, not the streets',
      notableFeatures: 'Slag-glass terraces, the seawall, the lower streets that flood twice daily',
      atmosphere: 'Accidental glitter over a city that governs itself around the water.',
    },
    body: [
      'Built on the slag of four hundred years of foundry work, the Glass City glitters in a way that is entirely accidental and universally claimed as design. Its lower streets are given over to the sea for six hours out of every twelve.',
      'The Order of the Tide governs from the upper terraces. The archive, the quay and the lanterns belong to the water.',
    ],
  },
  {
    key: 'elysiacity',
    name: 'Elysia',
    folder: 'Locations',
    tags: ['Ruin'],
    fields: [
      ['Status', 'Drowned'],
      ['Region', 'Outer Wrack'],
    ],
    profile: {
      type: 'Ruin',
      climate: 'Submerged',
      population: '0',
      dangerLevel: 'Ships give it a wide berth',
      notableFeatures: 'A shoal where a city used to be, lanterns still lit below the waterline',
      atmosphere: 'A drowned namesake nobody living has actually seen.',
    },
    body: [
      'The city the @elysia was named for, and the reason she has spent her whole life explaining that she is not from there. It went under in a single winter and is now a shoal that ships give a wide berth.',
    ],
  },
  {
    key: 'northlands',
    name: 'The Northlands',
    folder: 'Locations',
    tags: ['Homeland'],
    fields: [
      ['Status', 'Standing'],
      ['Region', 'Inland'],
    ],
    profile: {
      type: 'Region',
      climate: 'Cold, inland valleys',
      dangerLevel: 'Low',
      notableFeatures: 'No coastline for two hundred miles, a borrowed word for "ocean"',
      atmosphere: 'Quiet and unbothered by the tide that defines everywhere else in this story.',
    },
    body: [
      'Cold valleys, borrowed words, and no coastline for two hundred miles. @elysia came south at nineteen and has been asked to explain herself ever since.',
    ],
  },
  {
    key: 'drownedstair',
    name: 'The Drowned Stair',
    folder: 'Locations',
    tags: ['Archive'],
    fields: [
      ['Status', 'Flooding',],
      ['Region', 'Glass City, lower terraces'],
    ],
    profile: {
      type: 'Building',
      climate: 'Damp, tidal',
      government: 'The Tidal Archive',
      dangerLevel: 'Low, if you can swim',
      notableFeatures: 'Nine landings, four underwater at any given hour',
      atmosphere: 'A library that floods twice a day and keeps cataloguing anyway.',
    },
    body: [
      'Nine landings cut into the cliff, of which four are underwater at any given hour. @mira keeps the archive here, on the theory that anything worth preserving should be worth carrying upstairs twice a day.',
    ],
  },
  {
    key: 'lanternquay',
    name: 'Lantern Quay',
    folder: 'Locations',
    tags: ['Harbour'],
    fields: [
      ['Status', 'Standing'],
      ['Region', 'Glass City, waterline'],
    ],
    profile: {
      type: 'Landmark',
      climate: 'Coastal, foggy',
      dangerLevel: 'Contested — the Order rarely posts a watch here',
      notableFeatures: 'Eleven lanterns, one seawall',
      atmosphere: 'The one stretch of the city that still feels like it belongs to everyone.',
    },
    body: [
      'Eleven lanterns, one seawall, and the only stretch of the city where the Order has never managed to post a permanent watch. @elysia works here. So, less officially, does everyone else.',
    ],
  },
];

const CREATURES: DocSpec[] = [
  {
    key: 'chalkkeeper',
    name: 'The Chalk-Keeper',
    folder: 'Creatures',
    tags: ['Legend'],
    profile: {
      species: 'Sea Spirit',
      habitat: 'The harbour depths',
      diet: 'Unknown',
      size: 'Unknown',
      threatLevel: 'Unknown',
      abilities: 'Extends the count, Never seen directly',
      physicalFeatures: 'Never directly seen — only the wake it leaves behind, and the lights that stay lit when they shouldn’t.',
    },
    body: [
      'Nobody living has seen it. What they have is the count: eleven lights, every night, for longer than the chalk on the seawall can remember — until the night @elysia counts nine.',
      'Lanternwrights disagree on whether it keeps the harbour safe or merely keeps score. Nobody has proposed finding out which.',
    ],
  },
];

const TECH: DocSpec[] = [
  {
    key: 'blueoil',
    name: 'Blue Oil Lantern',
    folder: 'Objects',
    tags: ['Craft'],
    profile: {
      category: 'Tool',
      origin: 'The Lanternwright guild',
      rarity: 'Common, within Glass City',
      powerSource: 'Refined blue oil',
      function: 'Burns cold and slow, visible through fog at a distance no white flame manages.',
      properties: 'Fog-piercing, Cold-burning',
      limitations: 'Blue oil is expensive to refine and burns out faster than it looks like it should.',
    },
    body: [
      'The standard harbour lantern, and the reason @elysia has a job at all. Every one of them burns the same blue-white cold flame, which is either alchemy or tradition depending which lanternwright you ask.',
      'Eleven of them line the seawall at @lanternquay. Counting how many are lit is older than anyone currently doing the counting.',
    ],
  },
];

const NOTES: DocSpec[] = [
  {
    key: 'ordernote',
    name: 'The Order of the Tide',
    folder: 'Factions',
    tags: ['Faction'],
    body: [
      'Founded as a flood-defence guild, now the closest thing @glasscity has to a government. The Order issues writs, maintains the terraces, and decides which parts of the city are worth the cost of keeping dry.',
      'Its authority rests entirely on being right about the water. @kael understands this better than the people he answers to.',
    ],
  },
  {
    key: 'lanternlore',
    name: 'Blue oil and the counting of lights',
    folder: 'Lore',
    tags: ['Craft'],
    body: [
      'Blue oil burns cold and slow and shows through fog at a distance no white flame manages. The lanternwrights count the lights they can see from the seawall each night and record the number in chalk. Nobody now living remembers who the count is for.',
    ],
  },
  {
    key: 'openingscene',
    name: 'Opening — the seawall, low water',
    folder: 'Lore',
    tags: ['Draft'],
    body: [
      'The tide went out further than it should have, and kept going.',
      '@elysia had walked the seawall through eleven winters and knew the shape of every low water the coast was capable of. This was not one of them. Below her the harbour lay open to its bones — mooring chains, a drowned street, the ribs of something that had been a ship when her mother was a girl.',
      'She counted the lights out of habit. There were nine. There had been eleven the night before, and eleven every night for as long as the chalk on the seawall could remember.',
    ],
  },
];

interface ChapterSpec {
  title: string;
  body: string[];
}

/** The manuscript itself — separate from the Lore note above, which is an
 * early fragment rather than the polished opening. */
const CHAPTERS: ChapterSpec[] = [
  {
    title: 'Chapter One — The Count',
    body: [
      'The tide went out further than it should have, and kept going.',
      '@elysia had walked the seawall through eleven winters and knew the shape of every low water the coast was capable of. This was not one of them. Below her the harbour lay open to its bones — mooring chains, a drowned street, the ribs of something that had been a ship when her mother was a girl.',
      'She counted the lights out of habit, the way she counted everything now: doors, footsteps, the seconds between one wave and the next. There were nine. There had been eleven the night before, and eleven every night for as long as the chalk on the seawall could remember.',
      'By the time the sun came up the whole of @lanternquay had heard about it, and by noon half of @glasscity had an opinion, and none of them were the right one.',
    ],
  },
  {
    title: 'Chapter Two — The Writ',
    body: [
      '@kael came ashore on the last tide before the festival, which was either very good timing or very bad, and he had not yet decided which.',
      'He carried the writ the way he carried everything the Order gave him — visibly, and with the understanding that once it was drawn the conversation was already over. He had read Elysia Ambrose’s name on it eleven times on the crossing and had not gotten any more comfortable with it.',
      '“You’ll want to put that away before you reach the quay,” said the ferryman, not unkindly. “They don’t love the Order here even on a good day, and today the tide is nine lanterns short of a good day.”',
      'Kael put it away. It did not make the crossing any shorter, and it did not make what waited at the end of it any easier.',
    ],
  },
];

interface EventSpec {
  key: Key;
  title: string;
  summary: string;
  start: number;
  duration: number;
  pov: Key;
  characters: Key[];
  locations: Key[];
  tags?: string[];
  dateLabel?: string;
}

const EVENTS: EventSpec[] = [
  {
    key: 'festival',
    title: 'The Festival of Low Water',
    summary:
      'The city walks the exposed harbour floor once a year. This year the tide goes out too far, and stays out.',
    start: 1,
    duration: 2,
    pov: 'pov-elysia',
    characters: ['elysia', 'mira', 'oduya'],
    locations: ['glasscity', 'lanternquay'],
    tags: ['Act One'],
    dateLabel: 'Chapter 1–2',
  },
  {
    key: 'writ',
    title: 'The Writ Arrives',
    summary: 'Kael comes ashore on the last tide with a sealed writ bearing Elysia’s name.',
    start: 3,
    duration: 1,
    pov: 'pov-kael',
    characters: ['kael', 'elysia'],
    locations: ['lanternquay'],
    tags: ['Act One'],
  },
  {
    key: 'archive',
    title: 'Nine Landings Down',
    summary:
      'Mira takes Elysia below the waterline to a shelf that should not still be dry, and the chalk count they find there is older than the city.',
    start: 5,
    duration: 2,
    pov: 'pov-mira',
    characters: ['mira', 'elysia'],
    locations: ['drownedstair'],
    tags: ['Act One'],
  },
  {
    key: 'assassination',
    title: 'The Assassination',
    summary: 'A Warden dies on the seawall. Two lanterns go dark. Elian Rouke does not come back.',
    start: 8,
    duration: 1,
    pov: 'pov-kael',
    characters: ['oduya', 'kael', 'elian'],
    locations: ['lanternquay', 'glasscity'],
    tags: ['Act Two', 'Turning Point'],
  },
  {
    key: 'escape',
    title: 'Escape from the City',
    summary: 'Elysia goes over the seawall at slack water carrying the only copy of the count.',
    start: 10,
    duration: 2,
    pov: 'pov-elysia',
    characters: ['elysia', 'mira'],
    locations: ['glasscity', 'drownedstair'],
    tags: ['Act Two'],
  },
  {
    key: 'shoal',
    title: 'The Shoal That Was a City',
    summary: 'She reaches the drowned Elysia at last and finds the lanterns there still lit.',
    start: 14,
    duration: 2,
    pov: 'pov-elysia',
    characters: ['elysia'],
    locations: ['elysiacity'],
    tags: ['Act Three'],
  },
  {
    key: 'northroad',
    title: 'The North Road',
    summary: 'Kael follows the only lead he has left, inland, into country he does not understand.',
    start: 15,
    duration: 3,
    pov: 'pov-kael',
    characters: ['kael'],
    locations: ['northlands'],
    tags: ['Act Three'],
  },
];

const SECTIONS: Array<{ name: string; kind: TimelineSection['kind']; start: number; end: number }> = [
  { name: 'The Low Water', kind: 'era', start: 0, end: 8 },
  { name: 'The Long Tide', kind: 'era', start: 8, end: 20 },
  { name: 'Act One', kind: 'act', start: 0, end: 7 },
  { name: 'Act Two', kind: 'act', start: 7, end: 13 },
  { name: 'Act Three', kind: 'act', start: 13, end: 20 },
  { name: 'The Count', kind: 'arc', start: 1, end: 16 },
  { name: 'Kael’s Doubt', kind: 'arc', start: 3, end: 18 },
];

const POVS: Array<{ key: Key; name: string; character: Key; color: string }> = [
  { key: 'pov-elysia', name: 'Elysia', character: 'elysia', color: '#F5B942' },
  { key: 'pov-kael', name: 'Kael', character: 'kael', color: '#E0736D' },
  { key: 'pov-mira', name: 'Mira', character: 'mira', color: '#6FA8A0' },
];

const MARKERS: Array<{ location: Key; label: string; x: number; y: number }> = [
  { location: 'glasscity', label: 'Glass City', x: 780, y: 430 },
  { location: 'lanternquay', label: 'Lantern Quay', x: 660, y: 560 },
  { location: 'drownedstair', label: 'The Drowned Stair', x: 880, y: 585 },
  { location: 'elysiacity', label: 'Elysia (drowned)', x: 340, y: 700 },
  { location: 'northlands', label: 'The Northlands', x: 950, y: 150 },
];

const CELLS: Array<{ character: Key; location: Key; status: string; note: string }> = [
  {
    character: 'elysia',
    location: 'glasscity',
    status: 'Resident',
    note: 'Eleven winters on the seawall. Knows every lantern by the sound it makes in wind.',
  },
  {
    character: 'elysia',
    location: 'elysiacity',
    status: 'Namesake',
    note: 'Has never been. Corrects the assumption roughly once a week.',
  },
  {
    character: 'kael',
    location: 'lanternquay',
    status: 'Arriving',
    note: 'Comes ashore here in chapter three and never quite leaves the smell of it behind.',
  },
  {
    character: 'mira',
    location: 'drownedstair',
    status: 'Keeper',
    note: 'Effectively lives on the fifth landing.',
  },
];

const RELATIONSHIPS: Array<{ from: Key; to: Key; type: string; directed: boolean }> = [
  { from: 'elysia', to: 'mira', type: 'Friend', directed: false },
  { from: 'elysia', to: 'kael', type: 'Enemy', directed: false },
  { from: 'kael', to: 'mira', type: 'Former classmate', directed: false },
  { from: 'elysia', to: 'lanternquay', type: 'Works at', directed: true },
  { from: 'elysia', to: 'northlands', type: 'Born in', directed: true },
  { from: 'mira', to: 'drownedstair', type: 'Keeper of', directed: true },
  { from: 'elian', to: 'lanternquay', type: 'Last seen at', directed: true },
  { from: 'oduya', to: 'glasscity', type: 'Serves', directed: true },
];

const TAG_NAMES = [
  'Protagonist',
  'Antagonist',
  'Ally',
  'Supporting',
  'Lanternwright',
  'The Order',
  'Archivist',
  'Capital',
  'Ruin',
  'Homeland',
  'Archive',
  'Harbour',
  'Faction',
  'Craft',
  'Legend',
  'Draft',
  'Act One',
  'Act Two',
  'Act Three',
  'Turning Point',
];

/** Turns `@key` markers in demo prose into real entity-reference nodes. */
function parseBody(paragraphs: string[], resolve: (key: Key) => { id: string; name: string } | null): RichContent {
  const content = paragraphs.map((paragraph) => {
    const nodes: unknown[] = [];
    const pattern = /@([a-z]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(paragraph)) !== null) {
      const target = resolve(match[1]);
      if (!target) continue;
      if (match.index > lastIndex) {
        nodes.push({ type: 'text', text: paragraph.slice(lastIndex, match.index) });
      }
      nodes.push({
        type: 'entityReference',
        attrs: { entityId: target.id, label: target.name },
      });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < paragraph.length) {
      nodes.push({ type: 'text', text: paragraph.slice(lastIndex) });
    }
    return { type: 'paragraph', content: nodes.length > 0 ? nodes : undefined };
  });

  return { type: 'doc', content };
}

/**
 * Builds the demo project as a fully-formed bundle with fresh ids, ready to be
 * written to IndexedDB exactly like a user-created project.
 */
export function buildDemoProject(): ProjectBundle {
  const now = Date.now();
  const project: Project = {
    id: newId('project'),
    name: 'Tidewrack',
    description:
      'A demonstration world: a glass city on a drowning coast, three points of view, and a count of lanterns that nobody can explain.',
    template: 'fantasy',
    schemaVersion: SCHEMA_VERSION,
    archived: false,
    timelineOrigin: 1,
    timelineUnit: 'chapter',
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };

  const folders = materializeFolders(templateById('fantasy'), project.id);
  const folderByName = new Map(folders.map((folder) => [folder.name, folder]));

  const tags: Tag[] = TAG_NAMES.map((name, index) => ({
    id: newId('tag'),
    projectId: project.id,
    name,
    color: ['#F5B942', '#E0736D', '#6FA8A0', '#8C7BC4', '#D08A52', '#5E8FB5'][index % 6],
    createdAt: now,
  }));
  const tagIdByName = new Map(tags.map((tag) => [tag.name, tag.id]));

  // Ids are allocated before any prose is parsed so references can point at
  // documents that have not been built yet.
  const idByKey = new Map<Key, string>();
  const nameByKey = new Map<Key, string>();
  CHARACTERS.forEach((spec) => {
    idByKey.set(spec.key, newId('character'));
    nameByKey.set(spec.key, spec.name);
  });
  LOCATIONS.forEach((spec) => {
    idByKey.set(spec.key, newId('location'));
    nameByKey.set(spec.key, spec.name);
  });
  CREATURES.forEach((spec) => {
    idByKey.set(spec.key, newId('creature'));
    nameByKey.set(spec.key, spec.name);
  });
  TECH.forEach((spec) => {
    idByKey.set(spec.key, newId('tech'));
    nameByKey.set(spec.key, spec.name);
  });
  NOTES.forEach((spec) => {
    idByKey.set(spec.key, newId('note'));
    nameByKey.set(spec.key, spec.name);
  });

  const resolve = (key: Key) => {
    const id = idByKey.get(key);
    const name = nameByKey.get(key);
    return id && name ? { id, name } : null;
  };

  const buildDoc = (spec: DocSpec, index: number) => {
    const content = parseBody(spec.body, resolve);
    const text = docToPlainText(content);
    return {
      id: idByKey.get(spec.key)!,
      projectId: project.id,
      folderId: folderByName.get(spec.folder)?.id ?? null,
      name: spec.name,
      content,
      excerpt: makeExcerpt(text),
      wordCount: countWords(text),
      charCount: text.length,
      tagIds: (spec.tags ?? []).map((name) => tagIdByName.get(name)!).filter(Boolean),
      fields: (spec.fields ?? []).map(([label, value]) => ({
        id: newId('tag'),
        label,
        type: 'text' as const,
        value,
      })),
      order: index,
      createdAt: now,
      updatedAt: now,
    };
  };

  const map: StoryMap = {
    id: newId('map'),
    projectId: project.id,
    name: 'The Wrack Coast',
    width: 1400,
    height: 900,
    background: 'parchment',
    imageData: null,
    createdAt: now,
    updatedAt: now,
  };

  const characters: CharacterDoc[] = CHARACTERS.map((spec, i) => ({
    ...buildDoc(spec, i),
    kind: 'character' as const,
    profile: { ...(spec.profile ?? {}) },
  }));

  // Locations, creatures and tech have no prose editor — their body text
  // (still authored above as ordinary paragraphs, for convenience and so
  // @key references resolve the same way as everywhere else in this file)
  // becomes their profile's Notes field instead, exactly like the migration
  // does for a project that already existed before this change shipped.
  const locations: LocationDoc[] = LOCATIONS.map((spec, i) => {
    const doc = buildDoc(spec, i);
    return {
      ...doc,
      kind: 'location' as const,
      mapId: map.id,
      profile: { ...(spec.profile ?? {}), notes: docToPlainText(doc.content) },
    };
  });

  const creatures: CreatureDoc[] = CREATURES.map((spec, i) => {
    const doc = buildDoc(spec, i);
    return {
      ...doc,
      kind: 'creature' as const,
      profile: { ...(spec.profile ?? {}), notes: docToPlainText(doc.content) },
    };
  });

  const tech: TechDoc[] = TECH.map((spec, i) => {
    const doc = buildDoc(spec, i);
    return {
      ...doc,
      kind: 'tech' as const,
      profile: { ...(spec.profile ?? {}), notes: docToPlainText(doc.content) },
    };
  });

  const notes: NoteDoc[] = NOTES.map((spec, i) => ({
    ...buildDoc(spec, i),
    kind: 'note' as const,
  }));

  const chapters: ManuscriptChapter[] = CHAPTERS.map((spec, index) => {
    const content = parseBody(spec.body, resolve);
    const text = docToPlainText(content);
    return {
      id: newId('chapter'),
      projectId: project.id,
      title: spec.title,
      content,
      excerpt: makeExcerpt(text),
      wordCount: countWords(text),
      charCount: text.length,
      order: index,
      createdAt: now + index,
      updatedAt: now + index,
    };
  });

  const povIdByKey = new Map<Key, string>();
  const povs: PointOfView[] = POVS.map((spec, index) => {
    const id = newId('pov');
    povIdByKey.set(spec.key, id);
    return {
      id,
      projectId: project.id,
      name: spec.name,
      characterId: idByKey.get(spec.character) ?? null,
      color: spec.color,
      order: index,
      visible: true,
    };
  });

  const eventIdByKey = new Map<Key, string>();
  EVENTS.forEach((spec) => eventIdByKey.set(spec.key, newId('event')));

  const events: TimelineEvent[] = EVENTS.map((spec, index) => ({
    id: eventIdByKey.get(spec.key)!,
    projectId: project.id,
    title: spec.title,
    summary: spec.summary,
    start: spec.start,
    duration: spec.duration,
    dateLabel: spec.dateLabel ?? '',
    povId: povIdByKey.get(spec.pov) ?? null,
    characterIds: spec.characters.map((key) => idByKey.get(key)!).filter(Boolean),
    locationIds: spec.locations.map((key) => idByKey.get(key)!).filter(Boolean),
    tagIds: (spec.tags ?? []).map((name) => tagIdByName.get(name)!).filter(Boolean),
    relatedEventIds: [],
    notes: '',
    color: null,
    row: 0,
    createdAt: now,
    updatedAt: now + index,
  }));

  // A couple of hand-picked links so the "related events" field is not empty.
  const link = (a: Key, b: Key) => {
    const first = events.find((event) => event.id === eventIdByKey.get(a));
    const second = events.find((event) => event.id === eventIdByKey.get(b));
    if (first && second) {
      first.relatedEventIds.push(second.id);
      second.relatedEventIds.push(first.id);
    }
  };
  link('festival', 'archive');
  link('assassination', 'escape');

  const sections: TimelineSection[] = SECTIONS.map((spec, index) => ({
    id: newId('section'),
    projectId: project.id,
    name: spec.name,
    kind: spec.kind,
    start: spec.start,
    end: spec.end,
    color: ['#F5B942', '#6FA8A0', '#8C7BC4', '#E0736D', '#5E8FB5', '#D08A52', '#9AAE6B'][index % 7],
    order: index,
  }));

  const relationships: Relationship[] = RELATIONSHIPS.map((spec) => ({
    id: newId('relationship'),
    projectId: project.id,
    fromId: idByKey.get(spec.from)!,
    toId: idByKey.get(spec.to)!,
    type: spec.type,
    directed: spec.directed,
    note: '',
    createdAt: now,
    updatedAt: now,
  })).filter((relationship) => relationship.fromId && relationship.toId);

  const markers: MapMarker[] = MARKERS.map((spec) => ({
    id: newId('marker'),
    projectId: project.id,
    mapId: map.id,
    locationId: idByKey.get(spec.location) ?? null,
    label: spec.label,
    x: spec.x,
    y: spec.y,
    icon: 'pin',
    color: '#F5B942',
  }));

  const cells: MatrixCell[] = CELLS.map((spec) => ({
    id: newId('cell'),
    projectId: project.id,
    characterId: idByKey.get(spec.character)!,
    locationId: idByKey.get(spec.location)!,
    status: spec.status,
    note: spec.note,
    tagIds: [],
    updatedAt: now,
  }));

  // A few painted strokes and stamps so the map builder shows what it can
  // do the moment someone opens the demo, not just an empty canvas.
  const terrain: MapTerrainStroke[] = [
    {
      id: newId('terrainStroke'),
      projectId: project.id,
      mapId: map.id,
      terrain: 'water',
      points: [
        { x: 0, y: 780 },
        { x: 220, y: 740 },
        { x: 460, y: 770 },
        { x: 720, y: 730 },
        { x: 980, y: 760 },
        { x: 1250, y: 720 },
        { x: 1400, y: 750 },
      ],
      brushSize: 140,
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId('terrainStroke'),
      projectId: project.id,
      mapId: map.id,
      terrain: 'forest',
      points: [
        { x: 260, y: 260 },
        { x: 340, y: 220 },
        { x: 420, y: 250 },
        { x: 380, y: 340 },
        { x: 280, y: 350 },
      ],
      brushSize: 90,
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId('terrainStroke'),
      projectId: project.id,
      mapId: map.id,
      terrain: 'mountain',
      points: [
        { x: 980, y: 200 },
        { x: 1080, y: 170 },
        { x: 1180, y: 210 },
      ],
      brushSize: 100,
      order: 2,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const stamps: MapStamp[] = [
    {
      id: newId('stamp'),
      projectId: project.id,
      mapId: map.id,
      icon: 'tree',
      x: 300,
      y: 280,
      rotation: 0,
      scale: 1,
      color: '#3E6B37',
      order: 0,
    },
    {
      id: newId('stamp'),
      projectId: project.id,
      mapId: map.id,
      icon: 'pine',
      x: 360,
      y: 300,
      rotation: 0,
      scale: 1.1,
      color: '#2F5A32',
      order: 1,
    },
    {
      id: newId('stamp'),
      projectId: project.id,
      mapId: map.id,
      icon: 'ship',
      x: 620,
      y: 760,
      rotation: -8,
      scale: 1,
      color: '#5A4632',
      order: 2,
    },
    {
      id: newId('stamp'),
      projectId: project.id,
      mapId: map.id,
      icon: 'ruins',
      x: 1080,
      y: 320,
      rotation: 0,
      scale: 1,
      color: '#8B8378',
      order: 3,
    },
  ];

  return {
    project,
    folders,
    categories: builtinCategories(project.id, now),
    characters,
    locations,
    creatures,
    tech,
    customDocs: [],
    notes,
    tags,
    relationships,
    events,
    sections,
    povs,
    maps: [map],
    markers,
    cells,
    chapters,
    terrain,
    stamps,
  };
}
