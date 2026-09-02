import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

/** Names of every project-scoped table, used for bulk delete and export. */
export const PROJECT_TABLES = [
  'folders',
  'characters',
  'locations',
  'notes',
  'tags',
  'relationships',
  'events',
  'sections',
  'povs',
  'maps',
  'markers',
  'cells',
  'chapters',
] as const;

export type ProjectTableName = (typeof PROJECT_TABLES)[number];

let checked: Promise<{ ok: boolean; reason?: string }> | null = null;

/**
 * Confirms Supabase is reachable and the schema has been migrated in,
 * recovering from the two failure modes that otherwise leave the app
 * permanently blank: missing credentials, and a project whose migration
 * (supabase/migrations/0001_init.sql) hasn't been run yet.
 */
export async function openDatabase(): Promise<{ ok: boolean; reason?: string }> {
  if (!checked) checked = probe();
  return checked;
}

async function probe(): Promise<{ ok: boolean; reason?: string }> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      reason:
        'Supabase isn’t configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example) and reload.',
    };
  }

  try {
    const { error } = await supabase.from('projects').select('id').limit(1);
    if (!error) return { ok: true };

    // undefined_table — the schema migration hasn't been applied to this project yet.
    if (error.code === '42P01') {
      return {
        ok: false,
        reason:
          'Connected to Supabase, but the schema isn’t set up yet. Run supabase/migrations/0001_init.sql against this project.',
      };
    }
    return {
      ok: false,
      reason: `Could not reach Supabase: ${error.message}`,
    };
  } catch (error) {
    checked = null;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      ok: false,
      reason: `Could not reach Supabase (network error): ${message}`,
    };
  }
}

/** Lets a failed connection be retried (e.g. after the user fixes .env and reloads isn't enough — a manual retry button). */
export function resetDatabaseProbe(): void {
  checked = null;
}
