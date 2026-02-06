import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';

async function checkMenuAccess(supabase: ReturnType<typeof getServerSupabase>, menuId: string, user: JwtPayload): Promise<boolean> {
  const { data: menu } = await supabase.from('menus').select('business_id').eq('id', menuId).single();
  if (!menu) return false;
  if (user.role === 'super_admin') return true;
  const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
  return u?.business_id === (menu as { business_id: string }).business_id;
}

/** GET /menu-items?menu_id= */
export async function findAll(request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const menuId = new URL(request.url).searchParams.get('menu_id');
  if (!menuId) return Response.json({ message: 'menu_id query parameter is required' }, { status: 400 });
  const ok = await checkMenuAccess(supabase, menuId, user);
  if (!ok) return Response.json({ message: 'Menu not found or access denied' }, { status: 404 });
  const { data, error } = await supabase.from('menu_items').select('*').eq('menu_id', menuId).order('display_order', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /menu-items/:id */
export async function findOne(id: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: item } = await supabase.from('menu_items').select('*').eq('id', id).single();
  if (!item) return Response.json({ message: 'Menu item not found' }, { status: 404 });
  const ok = await checkMenuAccess(supabase, (item as { menu_id: string }).menu_id, user);
  if (!ok) return Response.json({ message: 'Access denied' }, { status: 403 });
  return Response.json(item);
}

/** POST /menu-items */
export async function create(request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  let body: { menu_id?: string; name?: string; description?: string; price?: number; image_url?: string; display_order?: number; page_index?: number; is_active?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.menu_id) return Response.json({ message: 'menu_id required' }, { status: 400 });
  const ok = await checkMenuAccess(supabase, body.menu_id, user);
  if (!ok) return Response.json({ message: 'Menu not found or access denied' }, { status: 403 });
  const { data, error } = await supabase.from('menu_items').insert({
    menu_id: body.menu_id,
    name: body.name ?? '',
    description: body.description ?? null,
    price: body.price ?? null,
    image_url: body.image_url ?? null,
    display_order: body.display_order ?? 0,
    page_index: body.page_index ?? 0,
    is_active: body.is_active ?? true,
  }).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** PATCH /menu-items/:id */
export async function update(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: item } = await supabase.from('menu_items').select('menu_id').eq('id', id).single();
  if (!item) return Response.json({ message: 'Menu item not found' }, { status: 404 });
  const ok = await checkMenuAccess(supabase, (item as { menu_id: string }).menu_id, user);
  if (!ok) return Response.json({ message: 'Access denied' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const allowed = ['name', 'description', 'price', 'image_url', 'display_order', 'page_index', 'is_active'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  if (Object.keys(updates).length === 0) {
    const { data } = await supabase.from('menu_items').select('*').eq('id', id).single();
    return Response.json(data);
  }
  const { data, error } = await supabase.from('menu_items').update(updates).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** DELETE /menu-items/:id */
export async function remove(id: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: item } = await supabase.from('menu_items').select('menu_id').eq('id', id).single();
  if (!item) return Response.json({ message: 'Menu item not found' }, { status: 404 });
  const ok = await checkMenuAccess(supabase, (item as { menu_id: string }).menu_id, user);
  if (!ok) return Response.json({ message: 'Access denied' }, { status: 403 });
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ message: 'Menu item deleted successfully' });
}
