-- Creatura — initial Supabase schema.
--
-- This replaces the browser-local IndexedDB store with a shared Postgres
-- database. Columns are snake_case (idiomatic Postgres); the app's TS layer
-- (src/lib/caseMapping.ts) converts to/from the app's camelCase records, so
-- no column here needs quoting despite the domain model being camelCase.
--
-- Timestamps are stored as `bigint` epoch-milliseconds (the same numbers
-- `Date.now()` produces in the app), not `timestamptz` — this keeps every
-- read/write a straight passthrough with no timezone/format conversion.
--
-- RLS is enabled on every table with a permissive "anyone with the anon key
-- can do anything" policy, matching the app's previous no-login, single-
-- store-per-browser behaviour — except now that store is shared by anyone
-- who has the anon key, since there is no per-user scoping yet. If you add
-- Supabase Auth later, tighten these policies (e.g. add a `user_id` column
-- and scope each policy to `auth.uid()`) before relying on this for
-- anything more than trusted personal/team use.

-- ── projects ──────────────────────────────────────────────────────────────
create table if not exists projects (
  id text primary key,
  name text not null default '',
  description text not null default '',
  template text not null default 'custom'
    check (template in ('fantasy', 'scifi', 'custom', 'blank')),
  schema_version integer not null default 1,
  archived boolean not null default false,
  timeline_origin double precision not null default 0,
  timeline_unit text not null default 'chapter'
    check (timeline_unit in ('day', 'chapter', 'year')),
  created_at bigint not null,
  updated_at bigint not null,
  last_opened_at bigint not null
);
create index if not exists projects_archived_idx on projects (archived);
create index if not exists projects_last_opened_at_idx on projects (last_opened_at);

-- ── folders ───────────────────────────────────────────────────────────────
create table if not exists folders (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  parent_id text,
  name text not null default '',
  default_kind text not null default 'note'
    check (default_kind in ('note', 'character', 'location')),
  icon text not null default 'folder',
  color text,
  order_index double precision not null default 0,
  collapsed boolean not null default false,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists folders_project_id_idx on folders (project_id);
create index if not exists folders_parent_id_idx on folders (parent_id);

-- ── characters / locations / notes ───────────────────────────────────────
-- Three tables rather than one polymorphic table, mirroring the original
-- IndexedDB design: it keeps each table's indexes tight, and the doc's kind
-- is implied by which table it's in (and by its id prefix), so `kind` isn't
-- stored as a column — the repository layer adds it back on read.
create table if not exists characters (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  folder_id text,
  name text not null default '',
  content jsonb not null default '{"type":"doc","content":[]}',
  excerpt text not null default '',
  word_count integer not null default 0,
  char_count integer not null default 0,
  tag_ids text[] not null default '{}',
  fields jsonb not null default '[]',
  order_index double precision not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists characters_project_id_idx on characters (project_id);
create index if not exists characters_folder_id_idx on characters (folder_id);

create table if not exists locations (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  folder_id text,
  name text not null default '',
  content jsonb not null default '{"type":"doc","content":[]}',
  excerpt text not null default '',
  word_count integer not null default 0,
  char_count integer not null default 0,
  tag_ids text[] not null default '{}',
  fields jsonb not null default '[]',
  order_index double precision not null default 0,
  map_id text,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists locations_project_id_idx on locations (project_id);
create index if not exists locations_folder_id_idx on locations (folder_id);
create index if not exists locations_map_id_idx on locations (map_id);

create table if not exists notes (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  folder_id text,
  name text not null default '',
  content jsonb not null default '{"type":"doc","content":[]}',
  excerpt text not null default '',
  word_count integer not null default 0,
  char_count integer not null default 0,
  tag_ids text[] not null default '{}',
  fields jsonb not null default '[]',
  order_index double precision not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists notes_project_id_idx on notes (project_id);
create index if not exists notes_folder_id_idx on notes (folder_id);

-- ── tags ──────────────────────────────────────────────────────────────────
create table if not exists tags (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  name text not null default 'tag',
  color text not null default '#F5B942',
  created_at bigint not null
);
create index if not exists tags_project_id_idx on tags (project_id);

-- ── relationships ─────────────────────────────────────────────────────────
create table if not exists relationships (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  from_id text not null,
  to_id text not null,
  type text not null default 'Related to',
  directed boolean not null default true,
  note text not null default '',
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists relationships_project_id_idx on relationships (project_id);
create index if not exists relationships_from_id_idx on relationships (from_id);
create index if not exists relationships_to_id_idx on relationships (to_id);

-- ── timeline events ───────────────────────────────────────────────────────
create table if not exists events (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  title text not null default 'Untitled event',
  summary text not null default '',
  start_pos double precision not null default 0,
  duration double precision not null default 1,
  date_label text not null default '',
  pov_id text,
  character_ids text[] not null default '{}',
  location_ids text[] not null default '{}',
  tag_ids text[] not null default '{}',
  related_event_ids text[] not null default '{}',
  notes text not null default '',
  color text,
  row_index integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists events_project_id_idx on events (project_id);
create index if not exists events_start_pos_idx on events (start_pos);
create index if not exists events_pov_id_idx on events (pov_id);

-- ── timeline sections (eras / acts / arcs / chapters-as-spans) ──────────────
create table if not exists sections (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  name text not null default 'Section',
  kind text not null default 'era' check (kind in ('era', 'act', 'arc', 'chapter')),
  start_pos double precision not null default 0,
  end_pos double precision not null default 10,
  color text not null default '#F5B942',
  order_index double precision not null default 0
);
create index if not exists sections_project_id_idx on sections (project_id);

-- ── points of view ────────────────────────────────────────────────────────
create table if not exists povs (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  name text not null default 'POV',
  character_id text,
  color text not null default '#F5B942',
  order_index double precision not null default 0,
  visible boolean not null default true
);
create index if not exists povs_project_id_idx on povs (project_id);

-- ── maps ──────────────────────────────────────────────────────────────────
create table if not exists maps (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  name text not null default 'Map',
  width double precision not null default 1600,
  height double precision not null default 1000,
  background text not null default 'parchment'
    check (background in ('grid', 'parchment', 'void', 'image')),
  image_data text,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists maps_project_id_idx on maps (project_id);

-- ── map markers ───────────────────────────────────────────────────────────
create table if not exists markers (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  map_id text not null references maps (id) on delete cascade,
  location_id text,
  label text not null default 'Marker',
  x double precision not null default 0,
  y double precision not null default 0,
  icon text not null default 'pin',
  color text not null default '#F5B942'
);
create index if not exists markers_project_id_idx on markers (project_id);
create index if not exists markers_map_id_idx on markers (map_id);
create index if not exists markers_location_id_idx on markers (location_id);

-- ── matrix cells (character × location annotations) ─────────────────────────
create table if not exists cells (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  character_id text not null,
  location_id text not null,
  status text not null default '',
  note text not null default '',
  tag_ids text[] not null default '{}',
  updated_at bigint not null,
  unique (character_id, location_id)
);
create index if not exists cells_project_id_idx on cells (project_id);

-- ── manuscript chapters ───────────────────────────────────────────────────
create table if not exists chapters (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  title text not null default 'Untitled chapter',
  content jsonb not null default '{"type":"doc","content":[]}',
  excerpt text not null default '',
  word_count integer not null default 0,
  char_count integer not null default 0,
  order_index double precision not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists chapters_project_id_idx on chapters (project_id);

-- ── per-document restore-point snapshots ─────────────────────────────────
create table if not exists snapshots (
  id text primary key,
  doc_id text not null,
  project_id text not null references projects (id) on delete cascade,
  content jsonb not null,
  word_count integer not null default 0,
  created_at bigint not null
);
create index if not exists snapshots_doc_id_idx on snapshots (doc_id);
create index if not exists snapshots_project_id_idx on snapshots (project_id);
create index if not exists snapshots_doc_id_created_at_idx on snapshots (doc_id, created_at);

-- ── settings (single shared row) ─────────────────────────────────────────
create table if not exists settings (
  id text primary key default 'app',
  appearance jsonb not null,
  editor jsonb not null,
  writing jsonb not null,
  interface jsonb not null,
  onboarding_complete boolean not null default false,
  active_project_id text,
  last_export_at bigint
);

-- ── row-level security ────────────────────────────────────────────────────
-- Permissive by design for now — see the header comment above.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'projects', 'folders', 'characters', 'locations', 'notes', 'tags',
      'relationships', 'events', 'sections', 'povs', 'maps', 'markers',
      'cells', 'chapters', 'snapshots', 'settings'
    ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "allow anon all" on %I;', t);
    execute format(
      'create policy "allow anon all" on %I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
