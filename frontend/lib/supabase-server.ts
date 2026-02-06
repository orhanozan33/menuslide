import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverSupabase: SupabaseClient | null = null;

const noopPromise = Promise.resolve({ data: null, error: null });
function chainNoop(): any {
  const c: any = () => c;
  c.then = (f: (x: any) => any) => noopPromise.then(f);
  c.catch = () => noopPromise;
  c.eq = c.select = c.insert = c.update = c.delete = c.order = c.limit = c.single = c.maybeSingle = c.or = c.in = c.not = c;
  return c;
}
const noopFrom = () => chainNoop();

/**
 * Server-side Supabase client with service role (bypasses RLS).
 * When NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing, returns a no-op client (yerel mod).
 */
export function getServerSupabase(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getServerSupabase must not be called in the browser');
  }
  if (!serverSupabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      serverSupabase = { from: noopFrom } as unknown as SupabaseClient;
      return serverSupabase;
    }
    serverSupabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverSupabase;
}
