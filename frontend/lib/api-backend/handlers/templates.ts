import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';

/** POST /templates */
export async function create(request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  let body: { name?: string; display_name?: string; description?: string; block_count?: number; preview_image_url?: string; is_active?: boolean; business_id?: string; target_user_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const targetUserId = (user.role === 'super_admin' || user.role === 'admin') && body.target_user_id
    ? body.target_user_id
    : user.userId;
  const blockCount = Math.min(16, Math.max(1, body.block_count ?? 1));
  const { data: template, error: insertErr } = await supabase
    .from('templates')
    .insert({
      name: body.name || body.display_name || 'Template',
      display_name: body.display_name || body.name || 'Template',
      description: body.description ?? null,
      block_count: blockCount,
      preview_image_url: body.preview_image_url ?? null,
      is_active: body.is_active ?? true,
      scope: 'user',
      created_by: targetUserId,
    })
    .select()
    .single();
  if (insertErr) return Response.json({ message: insertErr.message }, { status: 500 });
  for (let i = 0; i < blockCount; i++) {
    await supabase.from('template_blocks').insert({
      template_id: template.id,
      block_index: i,
      position_x: 0,
      position_y: 0,
      width: 100,
      height: 100,
    });
  }
  const { data: withBlocks } = await supabase.from('templates').select('*, template_blocks(*)').eq('id', template.id).single();
  return Response.json(withBlocks ?? template);
}

/** PATCH /templates/:id */
export async function update(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  if (user.role === 'business_user') {
    const { data: t } = await supabase.from('templates').select('created_by').eq('id', id).single();
    if (t?.created_by !== user.userId) return Response.json({ message: 'Access denied' }, { status: 403 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const allowed = ['name', 'display_name', 'description', 'block_count', 'preview_image_url', 'is_active'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  if (Object.keys(updates).length === 0) {
    const { data } = await supabase.from('templates').select('*').eq('id', id).single();
    return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
  }
  const { data, error } = await supabase.from('templates').update(updates).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** DELETE /templates/:id */
export async function remove(id: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: t } = await supabase.from('templates').select('is_system, created_by').eq('id', id).single();
  if (!t) return Response.json({ message: 'Not found' }, { status: 404 });
  if (t.is_system) return Response.json({ message: 'Cannot delete system templates' }, { status: 400 });
  if (user.role === 'business_user' && t.created_by !== user.userId)
    return Response.json({ message: 'Access denied' }, { status: 403 });
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ message: 'Template deleted successfully' });
}

/** GET /templates/:id/blocks - returns template_blocks for template */
export async function getTemplateBlocks(templateId: string): Promise<Response> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('template_blocks')
    .select('*')
    .eq('template_id', templateId)
    .order('block_index', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /templates/scope/:scope (system | user) */
export async function findByScope(scope: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('business_id');
  const userIdParam = searchParams.get('user_id');
  const targetUserId = (user.role === 'super_admin' || user.role === 'admin') && userIdParam ? userIdParam : user.userId;
  let q = supabase.from('templates').select('*').eq('scope', scope).eq('is_active', true);
  if (scope === 'user' && businessId) q = q.eq('business_id', businessId);
  if (user.role !== 'super_admin' && user.role !== 'admin') q = q.or(`created_by.eq.${targetUserId},scope.eq.system`);
  const { data, error } = await q.order('block_count', { ascending: true }).order('name', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** POST /templates/apply - apply template to screen */
export async function applyToScreen(request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  let body: { screen_id?: string; template_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const screenId = body.screen_id;
  const templateId = body.template_id;
  if (!screenId || !templateId) return Response.json({ message: 'screen_id and template_id required' }, { status: 400 });
  const { data: screen } = await supabase.from('screens').select('business_id').eq('id', screenId).single();
  if (!screen) return Response.json({ message: 'Screen not found' }, { status: 404 });
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (u?.business_id !== (screen as { business_id: string }).business_id) return Response.json({ message: 'Access denied' }, { status: 403 });
  }
  await supabase.from('screen_blocks').delete().eq('screen_id', screenId);
  const { data: tBlocks } = await supabase.from('template_blocks').select('*').eq('template_id', templateId).order('block_index', { ascending: true });
  for (const tb of tBlocks ?? []) {
    await supabase.from('screen_blocks').insert({
      screen_id: screenId,
      template_block_id: (tb as { id: string }).id,
      display_order: (tb as { block_index: number }).block_index,
      is_active: true,
      position_x: (tb as { position_x: number }).position_x,
      position_y: (tb as { position_y: number }).position_y,
      width: (tb as { width: number }).width,
      height: (tb as { height: number }).height,
    });
  }
  await supabase.from('screens').update({ template_id: templateId }).eq('id', screenId);
  return Response.json({ message: 'Template applied' });
}

/** POST /templates/:id/duplicate */
export async function duplicate(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { data: orig } = await supabase.from('templates').select('*').eq('id', id).single();
  if (!orig) return Response.json({ message: 'Template not found' }, { status: 404 });
  const o = orig as Record<string, unknown>;
  const { data: created, error } = await supabase.from('templates').insert({
    name: body.name || (String(o.name) + ' (Kopya)'),
    display_name: body.name || (String(o.display_name) + ' (Kopya)'),
    description: o.description,
    block_count: o.block_count,
    preview_image_url: o.preview_image_url,
    is_active: true,
    scope: 'user',
    created_by: user.userId,
  }).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  const { data: blocks } = await supabase.from('template_blocks').select('*').eq('template_id', id).order('block_index', { ascending: true });
  for (const b of blocks ?? []) {
    const bl = b as Record<string, unknown>;
    await supabase.from('template_blocks').insert({
      template_id: created.id,
      block_index: bl.block_index,
      position_x: bl.position_x,
      position_y: bl.position_y,
      width: bl.width,
      height: bl.height,
    });
  }
  const { data: withBlocks } = await supabase.from('templates').select('*, template_blocks(*)').eq('id', created.id).single();
  return Response.json(withBlocks ?? created);
}

/** POST /templates/:id/save-as */
export async function saveAs(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  return duplicate(id, request, user);
}

/** POST /templates/:id/create-menu-from-products - create menu from template block contents */
export async function createMenuFromProducts(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: template } = await supabase.from('templates').select('display_name').eq('id', id).single();
  if (!template) return Response.json({ message: 'Template not found' }, { status: 404 });
  const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
  const businessId = (u as { business_id: string } | null)?.business_id;
  if (!businessId) return Response.json({ message: 'User has no business' }, { status: 400 });
  const { data: menu } = await supabase.from('menus').insert({
    business_id: businessId,
    name: `${(template as { display_name: string }).display_name} Menüsü`,
    description: `Template'ten otomatik oluşturulan menü`,
    slide_duration: 5,
    is_active: true,
  }).select().single();
  if (!menu) return Response.json({ message: 'Failed to create menu' }, { status: 500 });
  return Response.json({ menu, message: 'Menu created' });
}

/** POST /templates/bulk-system - admin only */
export async function createBulkSystem(request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  return Response.json({ message: 'Bulk system templates: use DB migrations or seed.' });
}
