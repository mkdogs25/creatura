# Creatura

**Visual story bible, timeline mapper and minimalist writer.**

Creatura is a local-first creative-writing and worldbuilding studio. It puts a
structured world library, a manuscript editor, a visual chronology, an
integrated map and a character × location matrix on top of a single shared data
model — so a character you write once shows up everywhere they belong, and
renaming them updates every sentence that mentions them.

Everything lives in your browser's IndexedDB. No accounts, no server, no
network requests for your content.

Use this link to open it: https://mkdogs25.github.io/creatura/

## The workspaces

**World Library** — a nested folder tree of Notes and category documents
(Characters, Locations, Creatures, Tech, and any category you define — see
below), a details panel for tags, metadata fields and relationships, and a
Tiptap prose editor set in Charter for Notes. Typing `@` anywhere in prose
opens an autocomplete over every character, location and note in the project.

**Manuscript** — the actual draft: a reorderable sidebar of chapters, a
distraction-light editor, running word counts against a goal, and export to
Markdown or PDF.

**Timeline Mapper** — a horizontally scrolling chronology. Events drag to
reposition, their right edge drags to change duration, and dragging one between
POV swimlanes reassigns its point of view. Eras, acts and arcs are spans on the
same axis.

**Matrix View** — every character against every location. Cells are populated
from live project data (shared timeline events, relationships) plus whatever
you write into the intersection yourself. Off by default; enable its tab in
Settings → Interface, or reach it anytime through ⌘K.

## Categories: document kinds you define

Character, Location, Creature and Tech are built in, but they're not special —
each is a **Category**: a name, an icon, and a list of input fields. A
document in a category fills in those fields directly (a profile form, not
prose), so the same fact — a character's role, a location's danger level —
always lives in exactly one place instead of drifting into a paragraph
somewhere too. Notes are the exception and keep the free-form prose editor.

From **Settings → Categories** you can rename a category, change its icon,
and add, rename or delete its fields — including on the four built-ins. You
can also create entirely new categories (Factions, Artifacts, Vehicles,
whatever your project needs); they behave identically to the built-ins and
show up immediately in Quick Create, the command palette and every folder's
"New here" menu. Deleting a field only stops it from showing — a document's
existing value is kept, not erased.

## How the pieces fit together

Every persistent record carries a stable, prefixed id (`character_m3k1x9f2p`).
The prefix is what lets a reference stored anywhere — an `@mention` inside a
paragraph, a timeline event's cast list, a map marker — resolve back to its
owner without the referring record knowing which table it came from.

That has two consequences worth stating plainly:

- **Renaming never breaks a reference.** An `@mention` stores only the id; the
  name shown is re-resolved from the store on every render.
- **Deleting never breaks a document.** A reference to a deleted entity renders
  as a visibly unresolved token rather than throwing or silently vanishing from
  the author's sentence.

```
PROJECT
  ├── Folders ── Characters · Locations · Creatures · Tech · Notes · your categories
  ├── Categories ── field definitions the above documents fill in
  ├── Chapters (the manuscript) · Tags · Relationships
  ├── Timeline Events · POVs · Sections
  └── Maps ── Markers · Matrix Cells
                    │
      ┌─────────┬───┴────┬─────────┐
   Library  Manuscript  Timeline  Matrix
```

## Architecture

```
src/
├── app/            Application root, boot sequence, version
├── components/     UI by feature area (ui, navigation, editor, world-library,
│                   manuscript, timeline, matrix, map, metadata, settings,
│                   command-palette)
├── data/           Genre templates and the demo project's seed data
├── db/             Dexie database, Zod schemas, migrations, repositories
├── editor/         Tiptap nodes and extensions (entity references, @ suggestion)
├── features/       Domain logic: search, commands, import/export
├── hooks/          Navigation, shortcuts, theme, debounce
├── store/          Zustand stores (project, editor, ui, settings) + selectors
├── styles/         Design tokens and manuscript styling
├── types/          The domain model
└── utils/          Ids, text, fuzzy matching, time, colour
```

State is split by how often it changes: `projectStore` holds persistent domain
data and writes through to IndexedDB, `editorStore` holds per-keystroke editor
state, `uiStore` holds transient interface state, and `settingsStore` holds
preferences. Nothing subscribed to project data re-renders because the caret
moved.

## Data safety

- **Autosave** is debounced (700ms by default, configurable) and flushed on
  navigation, tab hide and unload — never per keystroke straight to disk.
- **Reads are validated.** Every record is parsed through Zod on the way out of
  IndexedDB. A row that cannot be repaired is dropped rather than crashing the
  view it appears in.
- **Restore points.** Each document keeps a short ring of recent states,
  restorable from the details panel.
- **Import is defensive.** Files are version-checked, re-keyed with fresh ids,
  de-duplicated, and stripped of references to records the file does not
  contain — so importing the same file twice yields two independent projects
  rather than one overwriting the other.
- **Local backup folder.** Optionally connect a folder on disk (via the File
  System Access API) and Creatura mirrors the active project to it on an
  interval, independent of IndexedDB.
- **Schema migrations** are additive, live in `src/db/migrations`, and never
  discard data — a migration that adds structure (like the category system)
  backfills it from what's already there instead of requiring a fresh start.

## Keyboard

`⌘K` search and commands · `⌘S` save now · `⌘.` focus mode · `⌘,` settings
`⌘1/2/3` switch view · `⌘\` library panel · `⌘/` details panel · `Esc` close

The full list is in Settings → Keyboard Shortcuts.

## Built with

React · TypeScript · Vite · Tailwind CSS · Tiptap · Dexie.js · Zustand · Zod ·
Lucide
