# Connecting Creatura to Supabase

Creatura's storage layer now talks to Supabase (Postgres) instead of the
browser's IndexedDB. Two things are needed before the app can save anything:

## 1. Run the schema migration

In your Supabase project's SQL Editor, paste and run
`supabase/migrations/0001_init.sql` (or use the Supabase CLI:
`supabase db push` / `psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql`
if you've linked the project locally).

This creates every table Creatura needs (projects, folders, characters,
locations, notes, tags, relationships, events, sections, povs, maps,
markers, cells, chapters, snapshots, settings) and enables Row Level
Security with a permissive policy on each table for both the `anon` and
`authenticated` roles.

**That policy is intentionally open** — anyone holding the project's anon
key can read and write everything, matching the app's previous no-login
behaviour (every browser used to get its own private IndexedDB; now every
client that has the anon key shares one Postgres database instead). If you
want per-user isolation, add Supabase Auth and rewrite the policies to scope
by `auth.uid()` before relying on this for anything beyond trusted
personal/team use.

## 2. Set the environment variables

Copy `.env.example` to `.env` (or `.env.local`) and fill in your project's
values, from **Settings → API** in the Supabase dashboard:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Both must keep the `VITE_` prefix — that's what makes Vite expose them to
the browser bundle. Restart `npm run dev` (or rebuild) after editing `.env`.

## Verifying it worked

Once both steps are done, reload the app. Settings → Data & Storage shows
connection status ("Database status: Connected" once it can reach the
`projects` table). If something's off, the app shows exactly what's wrong
instead of a blank screen:

- **"Supabase isn't configured yet"** — the env vars aren't set (or the dev
  server wasn't restarted after adding them).
- **"Connected to Supabase, but the schema isn't set up yet"** — the env
  vars are right, but step 1 hasn't been run against this project.
- Any other message is the Postgres/PostgREST error text verbatim.

## For the deployed (GitHub Pages) build

Vite inlines `VITE_`-prefixed env vars at build time, not at runtime — a
local `.env` only affects `npm run dev`/`npm run build` on your machine.
For the GitHub Pages deploy to reach Supabase too, add the same two values
as repository secrets (**Settings → Secrets and variables → Actions**):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

`.github/workflows/deploy-pages.yml` already passes them through to the
build step — nothing else to change once the secrets exist. Until they're
added, the deployed site builds and runs fine, just showing the same
"Supabase isn't configured yet" state described above.

## Notes on the design

- **Timestamps** are stored as `bigint` epoch-milliseconds (the same numbers
  `Date.now()` produces), not `timestamptz` — every read/write is a direct
  passthrough with no timezone or format conversion.
- **Columns are snake_case** (idiomatic Postgres); `src/lib/caseMapping.ts`
  converts to/from the app's camelCase records automatically, so nothing
  in the application code deals with the difference.
- **No client-side multi-table transactions.** Supabase's REST interface
  doesn't expose one, so operations that touch several tables (creating a
  project, importing a bundle) upsert each table independently rather than
  atomically. A `projects` row deletion *is* atomic, though — every child
  table cascades via `on delete cascade` foreign keys in one statement.
- **`kind` isn't a stored column** on `characters`/`locations`/`notes` —
  which table a row lives in already says what it is. The repository layer
  adds the field back on read and strips it before writing.
