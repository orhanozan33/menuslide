import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';

function generatePublicToken(): string {
  return randomBytes(32).toString('hex');
}

function slugify(name: string): string {
  const map: Record<string, string> = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };
  let s = name.split('').map((c) => map[c] ?? c).join('').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').replace(/\s/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'screen-' + Date.now().toString(36);
}

async function uniqueSlug(supabase: ReturnType<typeof getServerSupabase>, base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (true) {
    const { data } = await supabase.from('screens').select('id').eq('public_slug', slug).limit(1).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${n}`;
    n++;
  }
}

async function checkScreenAccess(supabase: ReturnType<typeof getServerSupabase>, screenId: string, user: JwtPayload): Promise<{ business_id: string } | null> {
  const { data: screen } = await supabase.from('screens').select('business_id').eq('id', screenId).single();
  if (!screen) return null;
  if (user.role === 'super_admin' || user.role === 'admin') return screen as { business_id: string };
  const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
  if (u?.business_id !== screen.business_id) return null;
  return screen as { business_id: string };
}

async function isSubscriptionActive(supabase: ReturnType<typeof getServerSupabase>, businessId: string): Promise<boolean> {
  const { data } = await supabase.from('subscriptions').select('id').eq('business_id', businessId).eq('status', 'active').limit(1).maybeSingle();
  if (!data) return false;
  return true;
}

/** POST /screens */
export async function create(request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  let body: { business_id?: string; name?: string; location?: string; template_id?: string } = {};
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
  const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
  const businessName = (biz as { name?: string } | null)?.name || 'business';
  const name = body.name || 'TV1';
  const combined = `${businessName} ${name}`;
  const publicSlug = await uniqueSlug(supabase, slugify(combined));
  const { data, error } = await supabase.from('screens').insert({
    business_id: businessId,
    name,
    location: body.location ?? null,
    public_token: generatePublicToken(),
    public_slug: publicSlug,
    is_active: true,
    animation_type: 'fade',
    animation_duration: 500,
    template_id: body.template_id ?? null,
  }).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** PATCH /screens/:id */
export async function update(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, id, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const allowed = ['name', 'location', 'is_active', 'animation_type', 'animation_duration', 'language_code', 'font_family', 'primary_color', 'background_style', 'background_color', 'background_image_url', 'logo_url', 'template_id', 'frame_type', 'ticker_text', 'ticker_style'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  if (body.name && typeof body.name === 'string') {
    const { data: scr } = await supabase.from('screens').select('business_id').eq('id', id).single();
    if (scr) {
      const { data: biz } = await supabase.from('businesses').select('name').eq('id', (scr as { business_id: string }).business_id).single();
      const businessName = (biz as { name?: string } | null)?.name || 'business';
      updates.public_slug = await uniqueSlug(supabase, slugify(`${businessName} ${body.name}`));
    }
  }
  if (Object.keys(updates).length === 0) {
    const { data } = await supabase.from('screens').select('*').eq('id', id).single();
    return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
  }
  const { data, error } = await supabase.from('screens').update(updates).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** DELETE /screens/:id */
export async function remove(id: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, id, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const { error } = await supabase.from('screens').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ message: 'Screen deleted successfully' });
}

/** GET /screens/:id/menus */
export async function getScreenMenus(screenId: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const { data: rows } = await supabase.from('screen_menu').select('*, menus(id, name, description, slide_duration, is_active)').eq('screen_id', screenId).order('display_order', { ascending: true });
  const list = (rows ?? []).map((r: Record<string, unknown> & { menus: unknown }) => ({
    ...r,
    menus: r.menus ?? { id: r.menu_id, name: null, description: null, slide_duration: 5, is_active: true },
  }));
  return Response.json(list);
}

/** POST /screens/:id/assign-menu */
export async function assignMenu(screenId: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  let body: { menu_id?: string; display_order?: number } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const menuId = body.menu_id;
  if (!menuId) return Response.json({ message: 'menu_id required' }, { status: 400 });
  const { data: menu } = await supabase.from('menus').select('business_id').eq('id', menuId).single();
  if (!menu || (menu as { business_id: string }).business_id !== screen.business_id)
    return Response.json({ message: 'Menu not found or different business' }, { status: 400 });
  const { data: existing } = await supabase.from('screen_menu').select('id').eq('screen_id', screenId).eq('menu_id', menuId).maybeSingle();
  const displayOrder = body.display_order ?? 0;
  if (existing) {
    const { data: updated } = await supabase.from('screen_menu').update({ display_order: displayOrder }).eq('id', (existing as { id: string }).id).select().single();
    return Response.json(updated ?? existing);
  }
  const { data: inserted, error } = await supabase.from('screen_menu').insert({ screen_id: screenId, menu_id: menuId, display_order: displayOrder }).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(inserted);
}

/** DELETE /screens/:id/menus/:menuId */
export async function removeMenu(screenId: string, menuId: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const { error } = await supabase.from('screen_menu').delete().eq('screen_id', screenId).eq('menu_id', menuId);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ message: 'Menu removed from screen successfully' });
}

/** GET /screens/:id/template-rotations */
export async function getTemplateRotations(screenId: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const { data: rotations } = await supabase.from('screen_template_rotations').select('*, template:templates(id, display_name, description, block_count)').eq('screen_id', screenId).eq('is_active', true).order('display_order', { ascending: true });
  return Response.json(rotations ?? []);
}

/** POST /screens/:id/publish-templates */
export async function publishTemplates(screenId: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const active = await isSubscriptionActive(supabase, screen.business_id);
  if (!active) return Response.json({ message: 'Subscription expired or payment failed. Renew your subscription to broadcast.' }, { status: 403 });
  let body: { templates?: { template_id: string; display_duration?: number }[]; frame_type?: string; ticker_text?: string; ticker_style?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const templates = body.templates ?? [];
  if (templates.length === 0) return Response.json({ message: 'At least one template required' }, { status: 400 });
  await supabase.from('screen_template_rotations').delete().eq('screen_id', screenId);
  await supabase.from('screen_blocks').delete().eq('screen_id', screenId);
  const first = templates[0];
  await supabase.from('screens').update({ template_id: first.template_id, is_active: true }).eq('id', screenId);
  const { data: tBlocks } = await supabase.from('template_blocks').select('*').eq('template_id', first.template_id).order('block_index', { ascending: true });
  for (const tb of tBlocks ?? []) {
    await supabase.from('screen_blocks').insert({
      screen_id: screenId,
      template_block_id: (tb as { id: string }).id,
      display_order: (tb as { block_index: number }).block_index,
      is_active: true,
    });
  }
  for (let i = 0; i < templates.length; i++) {
    await supabase.from('screen_template_rotations').insert({
      screen_id: screenId,
      template_id: templates[i].template_id,
      display_duration: templates[i].display_duration ?? 10,
      display_order: i,
      is_active: true,
    });
  }
  const frameUpdates: Record<string, unknown> = {};
  if (body.frame_type !== undefined) frameUpdates.frame_type = body.frame_type;
  if (body.ticker_text !== undefined) frameUpdates.ticker_text = body.ticker_text;
  if (body.ticker_style !== undefined) frameUpdates.ticker_style = body.ticker_style;
  if (Object.keys(frameUpdates).length > 0) {
    await supabase.from('screens').update(frameUpdates).eq('id', screenId);
  }
  return Response.json({ message: 'Templates published successfully', count: templates.length });
}

/** POST /screens/:id/stop-publishing */
export async function stopPublishing(screenId: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  await supabase.from('screens').update({ is_active: false }).eq('id', screenId);
  await supabase.from('screen_template_rotations').update({ is_active: false }).eq('screen_id', screenId);
  return Response.json({ message: 'Publishing stopped successfully' });
}

/** GET /screens/alerts/multi-device - super_admin only */
export async function getMultiDeviceAlerts(user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin') return Response.json({ message: 'Only super admin can view multi-device alerts' }, { status: 403 });
  const supabase = getServerSupabase();
  const stale = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: viewers } = await supabase.from('display_viewers').select('screen_id').gt('last_seen_at', stale);
  const byScreen: Record<string, number> = {};
  for (const v of viewers ?? []) {
    const sid = (v as { screen_id: string }).screen_id;
    byScreen[sid] = (byScreen[sid] ?? 0) + 1;
  }
  const screenIds = Object.keys(byScreen).filter((sid) => (byScreen[sid] ?? 0) > 1);
  if (screenIds.length === 0) return Response.json([]);
  const { data: screens } = await supabase.from('screens').select('id, name').in('id', screenIds);
  const { data: biz } = await supabase.from('businesses').select('id, name');
  const bizMap = Object.fromEntries((biz ?? []).map((b: { id: string; name: string }) => [b.id, b.name]));
  const { data: scrWithBiz } = await supabase.from('screens').select('id, name, business_id').in('id', screenIds);
  const list = (scrWithBiz ?? []).map((s: { id: string; name: string; business_id: string }) => ({
    screen_id: s.id,
    screen_name: s.name,
    business_name: bizMap[s.business_id] ?? null,
    active_viewer_count: byScreen[s.id] ?? 0,
  }));
  return Response.json(list);
}
