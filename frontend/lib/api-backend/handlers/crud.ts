import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';

const TABLES_SCOPED_BY_BUSINESS = new Set(['menus', 'screens', 'templates', 'subscriptions']);
const TABLES_SCOPED_BY_USER = new Set(['content-library']);

/** Resolve business_id for list scope (menus/screens/templates) */
async function getListBusinessId(
  supabase: ReturnType<typeof getServerSupabase>,
  user: JwtPayload,
  actualTable: string,
  searchParams: URLSearchParams
): Promise<string | null> {
  const userIdParam = searchParams.get('user_id') || searchParams.get('userId');
  if ((user.role === 'super_admin' || user.role === 'admin') && userIdParam && String(userIdParam).trim()) {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', String(userIdParam).trim()).maybeSingle();
    return u?.business_id ?? null;
  }
  if (user.role === 'business_user' && user.userId) {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    return u?.business_id ?? null;
  }
  if (user.role === 'super_admin') return null;
  const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
  return u?.business_id ?? null;
}

/** GET /resource or GET /resource/:id - Supabase list/single with optional scope */
export async function handleGet(
  pathSegments: string[],
  user: JwtPayload,
  searchParams: URLSearchParams
): Promise<Response> {
  const supabase = getServerSupabase();
  const [table, id, sub] = pathSegments;
  if (!table) return Response.json({ message: 'Not found' }, { status: 404 });

  const tableMap: Record<string, string> = {
    users: 'users',
    businesses: 'businesses',
    plans: 'plans',
    menus: 'menus',
    screens: 'screens',
    templates: 'templates',
    subscriptions: 'subscriptions',
    'content-library': 'content_library',
  };
  const actualTable = tableMap[table];
  if (!actualTable) return Response.json({ message: 'Not found' }, { status: 404 });

  let query = supabase.from(actualTable).select('*');

  if (user.role === 'business_user' && user.userId && TABLES_SCOPED_BY_BUSINESS.has(actualTable)) {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    const businessId = u?.business_id;
    if (businessId) query = query.eq('business_id', businessId);
  }
  if (user.role === 'business_user' && user.userId && actualTable === 'content_library') {
    query = query.or(`uploaded_by.eq.${user.userId},uploaded_by.is.null`);
  }

  if (id && id.length === 36 && id.match(/^[0-9a-f-]{36}$/i)) {
    const { data, error } = await query.eq('id', id).maybeSingle();
    if (error) return Response.json({ message: error.message }, { status: 500 });
    return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
  }

  const userIdParam = searchParams.get('user_id');
  if (userIdParam && (actualTable === 'templates' || actualTable === 'screens' || actualTable === 'menus')) {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', userIdParam).maybeSingle();
    if (u?.business_id) query = query.eq('business_id', u.business_id);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  const list = data ?? [];

  if (actualTable === 'menus') {
    const businessId = await getListBusinessId(supabase, user, actualTable, searchParams);
    return Response.json({ menus: list, business_id: businessId });
  }
  if (actualTable === 'screens') {
    const businessId = await getListBusinessId(supabase, user, actualTable, searchParams);
    const screenIds = (list as { id: string }[]).map((s) => s.id);
    let viewerCounts: Record<string, number> = {};
    if (screenIds.length > 0) {
      const stale = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: viewers } = await supabase.from('display_viewers').select('screen_id').gt('last_seen_at', stale);
      const byScreen: Record<string, number> = {};
      for (const v of viewers ?? []) {
        const sid = (v as { screen_id: string }).screen_id;
        byScreen[sid] = (byScreen[sid] ?? 0) + 1;
      }
      viewerCounts = byScreen;
    }
    const subActive = businessId
      ? (await supabase.from('subscriptions').select('id').eq('business_id', businessId).eq('status', 'active').limit(1).maybeSingle()).data != null
      : true;
    const screens = (list as { id: string }[]).map((s) => ({ ...s, active_viewer_count: viewerCounts[s.id] ?? 0 }));
    return Response.json({ screens, subscription_active: subActive });
  }

  return Response.json(list);
}
