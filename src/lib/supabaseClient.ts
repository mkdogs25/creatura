import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True once both env vars are present — checked before every connection attempt. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The single Supabase client for the app.
 *
 * Created even when unconfigured (with placeholder values) so importing this
 * module never throws — callers check `isSupabaseConfigured` (or read the
 * `ok`/`reason` result from `openDatabase()`) before relying on it actually
 * reaching a project.
 */
export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      // No login flow yet — nothing to persist across reloads.
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
