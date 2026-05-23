/**
 * Client Supabase (browser) — Auth / Storage quand VITE_SUPABASE_* sont définis.
 * Après connexion Supabase, échangez le JWT via POST /api/auth/supabase { access_token }.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseBrowser =
  url && anon
    ? createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export function isSupabaseConfigured() {
  return !!(url && anon);
}
