import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';

async function getBusinessId(supabase: ReturnType<typeof getServerSupabase>, userId: string, role: string, targetUserId?: string): Promise<string | null> {
  const effective = (role === 'super_admin' || role === 'admin') && targetUserId ? targetUserId : userId;
  const { data: u } = await supabase.from('users').select('business_id').eq('id', effective).single();
  return u?.business_id ?? null;
}

/** GET /menus/stats/summary */
export async function getStats(user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  if (user.role === 'super_admin') {
    const { count: menusCount } = await supabase.from('menus').select('*', { count: 'exact', head: true });
    const { data: items } = await supabase.from('menu_items').select('id').eq('is_active', true);
    return Response.json({ menus: menusCount ?? 0, menuItems: items?.length ?? 0 });
  }
  const businessId = await getBusinessId(supabase, user.userId, user.role);
  if (!businessId) return Response.json({ menus: 0, menuItems: 0 });
  const { data: menus } = await supabase.from('menus').select('id').eq('business_id', businessId);
  const menuIds = (menus ?? []).map((m: { id: string }) => m.id);
  let menuItems = 0;
  if (menuIds.length > 0) {
    const { count } = await supabase.from('menu_items').select('*', { count: 'exact', head: true }).in('menu_id', menuIds).eq('is_active', true);
    menuItems = count ?? 0;
  }
  return Response.json({ menus: menus?.length ?? 0, menuItems });
}

/** POST /menus */
export async function create(request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  let body: { business_id?: string; name?: string; description?: string; slide_duration?: number; is_active?: boolean; pages_config?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const businessId = body.business_id;
  if (!businessId) return Response.json({ message: 'business_id required' }, { status: 400 });
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (u?.business_id !== businessId) return Response.json({ message: 'Access denied' }, { status: 403 });
  }
  const pagesConfig = body.pages_config && Array.isArray(body.pages_config)
    ? body.pages_config
    : [{ name: 'Sayfa 1', order: 0 }];
  const { data, error } = await supabase
    .from('menus')
    .insert({
      business_id: businessId,
      name: body.name || 'Menu',
      description: body.description ?? null,
      slide_duration: body.slide_duration ?? 5,
      is_active: body.is_active ?? true,
      pages_config: pagesConfig,
    })
    .select()
    .single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** PATCH /menus/:id */
export async function update(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: menu } = await supabase.from('menus').select('business_id').eq('id', id).single();
  if (!menu) return Response.json({ message: 'Not found' }, { status: 404 });
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (u?.business_id !== menu.business_id) return Response.json({ message: 'Access denied' }, { status: 403 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const allowed = ['name', 'description', 'slide_duration', 'is_active', 'pages_config'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  if (Object.keys(updates).length === 0) {
    const { data } = await supabase.from('menus').select('*').eq('id', id).single();
    return Response.json(data);
  }
  const { data, error } = await supabase.from('menus').update(updates).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** DELETE /menus/:id */
export async function remove(id: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: menu } = await supabase.from('menus').select('business_id').eq('id', id).single();
  if (!menu) return Response.json({ message: 'Not found' }, { status: 404 });
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (u?.business_id !== menu.business_id) return Response.json({ message: 'Access denied' }, { status: 403 });
  }
  const { error } = await supabase.from('menus').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ message: 'Menu deleted successfully' });
}
