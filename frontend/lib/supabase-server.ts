import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverSupabase: SupabaseClient | null = null;

/**
 * Server-side Supabase client with service role (bypasses RLS).
 * Use only in API routes / server components.
 * Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
 */
export function getServerSupabase(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getServerSupabase must not be called in the browser');
  }
  if (!serverSupabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    serverSupabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverSupabase;
}
