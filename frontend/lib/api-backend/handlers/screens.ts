import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { getServerSupabase } from '@/lib/supabase-server';
import { getDefaultStreamUrl } from '@/lib/stream-url';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, queryOne, queryLocal, insertLocal, updateLocal, deleteLocal, runLocal, mirrorToSupabase } from '@/lib/api-backend/db-local';
import { insertAdminActivityLog } from '@/lib/api-backend/admin-activity-log';

function generatePublicToken(): string {
  return randomBytes(32).toString('hex');
}

function generateBroadcastCode(): string {
  return String(10000 + Math.floor(Math.random() * 90000));
}

function slugify(name: string): string {
  const map: Record<string, string> = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };
  let s = name.split('').map((c) => map[c] ?? c).join('').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').replace(/\s/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'screen-' + Date.now().toString(36);
}

async function uniqueSlugLocal(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (true) {
    const row = await queryOne('SELECT id FROM screens WHERE public_slug = $1 LIMIT 1', [slug]);
    if (!row) return slug;
    slug = `${base}-${n}`;
    n++;
  }
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

async function checkScreenAccessLocal(screenId: string, user: JwtPayload): Promise<{ business_id: string } | null> {
  const screen = await queryOne<{ business_id: string }>('SELECT business_id FROM screens WHERE id = $1', [screenId]);
  if (!screen) return null;
  if (user.role === 'super_admin' || user.role === 'admin') return screen;
  const u = await queryOne<{ business_id: string }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
  if (u?.business_id !== screen.business_id) return null;
  return screen;
}

async function checkScreenAccess(supabase: ReturnType<typeof getServerSupabase>, screenId: string, user: JwtPayload): Promise<{ business_id: string } | null> {
  const { data: screen } = await supabase.from('screens').select('business_id').eq('id', screenId).single();
  if (!screen) return null;
  if (user.role === 'super_admin' || user.role === 'admin') return screen as { business_id: string };
  const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
  if (u?.business_id !== screen.business_id) return null;
  return screen as { business_id: string };
}

async function isSubscriptionActiveLocal(businessId: string): Promise<boolean> {
  const row = await queryOne('SELECT id FROM subscriptions WHERE business_id = $1 AND status = $2 LIMIT 1', [businessId, 'active']);
  return !!row;
}

async function isSubscriptionActive(supabase: ReturnType<typeof getServerSupabase>, businessId: string): Promise<boolean> {
  const { data } = await supabase.from('subscriptions').select('id').eq('business_id', businessId).eq('status', 'active').limit(1).maybeSingle();
  if (!data) return false;
  return true;
}

const SUPER_ADMIN_MAX_SCREENS = 50;

/** Abonelik ve ekran limiti kontrolü. super_admin: işletme başına cap. admin/tv_user: limit yok (sistem TV = sınırsız yayın). sistemtv@gmail.com: sadece bu kullanıcı için ekran ve yayın limiti yok. */
async function canCreateScreen(businessId: string, user: JwtPayload): Promise<{ ok: boolean; message?: string }> {
  // sistemtv@gmail.com kullanıcısının işletmesi için ekran limiti yok — sadece bu kullanıcı için geçerli
  try {
    if (useLocalDb()) {
      const row = await queryOne<{ cnt: string }>('SELECT COUNT(*)::text as cnt FROM users WHERE business_id = $1 AND LOWER(email) = $2', [businessId, 'sistemtv@gmail.com']);
      if (row && parseInt(row.cnt || '0', 10) > 0) return { ok: true };
    } else {
      const supabase = getServerSupabase();
      const { data } = await supabase.from('users').select('id').eq('business_id', businessId).ilike('email', 'sistemtv@gmail.com').limit(1).maybeSingle();
      if (data) return { ok: true };
    }
  } catch {
    // Hata olursa normal akışa devam et
  }
  if (user.role === 'super_admin') {
    try {
      let count = 0;
      if (useLocalDb()) {
        const row = await queryOne<{ cnt: string }>('SELECT COUNT(*)::text as cnt FROM screens WHERE business_id = $1', [businessId]);
        count = parseInt(row?.cnt || '0', 10);
      } else {
        const supabase = getServerSupabase();
        const { count: c } = await supabase.from('screens').select('*', { count: 'exact', head: true }).eq('business_id', businessId);
        count = c ?? 0;
      }
      if (count >= SUPER_ADMIN_MAX_SCREENS) {
        return { ok: false, message: `Super admin limiti: en fazla ${SUPER_ADMIN_MAX_SCREENS} ekran atanabilir.` };
      }
    } catch (e) {
      console.error('[screens] super_admin limit check error:', e);
      return { ok: false, message: 'Limit kontrolü yapılamadı.' };
    }
    return { ok: true };
  }
  if (user.role === 'admin' || user.role === 'tv_user') {
    return { ok: true };
  }
  try {
    if (useLocalDb()) {
      const row = await queryOne<{ can_create: boolean }>('SELECT check_screen_limit($1) as can_create', [businessId]);
      if (!row?.can_create) {
        return { ok: false, message: 'Bu işletme için aktif abonelik yok veya ekran limiti aşıldı. Paket alın veya yükseltin.' };
      }
    } else {
      const supabase = getServerSupabase();
      if (typeof (supabase as any).rpc === 'function') {
        const { data, error } = await (supabase as any).rpc('check_screen_limit', { p_business_id: businessId });
        if (error) {
          console.error('[screens] check_screen_limit error:', error);
          return { ok: false, message: 'Abonelik kontrolü yapılamadı.' };
        }
        if (!data) {
          return { ok: false, message: 'Bu işletme için aktif abonelik yok veya ekran limiti aşıldı. Paket alın veya yükseltin.' };
        }
      }
    }
  } catch (e) {
    console.error('[screens] canCreateScreen error:', e);
    return { ok: false, message: 'Abonelik kontrolü yapılamadı.' };
  }
  return { ok: true };
}

/** POST /screens */
export async function create(request: NextRequest, user: JwtPayload): Promise<Response> {
  let body: { business_id?: string; name?: string; location?: string; template_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const businessId = body.business_id;
  if (!businessId) return Response.json({ message: 'business_id required' }, { status: 400 });

  const limitCheck = await canCreateScreen(businessId, user);
  if (!limitCheck.ok) {
    return Response.json({ message: limitCheck.message || 'Ekran oluşturulamadı.' }, { status: 403 });
  }

  if (useLocalDb()) {
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      const u = await queryOne<{ business_id: string }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
      if (u?.business_id !== businessId) return Response.json({ message: 'Access denied' }, { status: 403 });
    }
    const biz = await queryOne<{ name?: string }>('SELECT name FROM businesses WHERE id = $1', [businessId]);
    const businessName = biz?.name || 'business';
    const name = body.name || 'TV1';
    const publicSlug = await uniqueSlugLocal(slugify(`${businessName} ${name}`));
    const allowMultiDevice = user.role === 'super_admin';
    let broadcastCode = generateBroadcastCode();
    for (let i = 0; i < 20; i++) {
      const exists = await queryOne('SELECT 1 FROM screens WHERE broadcast_code = $1 LIMIT 1', [broadcastCode]);
      if (!exists) break;
      broadcastCode = generateBroadcastCode();
    }
    const defaultStreamUrl = getDefaultStreamUrl(publicSlug);
    const data = await insertLocal('screens', {
      business_id: businessId,
      name,
      location: body.location ?? null,
      public_token: generatePublicToken(),
      public_slug: publicSlug,
      broadcast_code: broadcastCode,
      is_active: true,
      animation_type: 'fade',
      animation_duration: 500,
      template_id: body.template_id ?? null,
      allow_multi_device: allowMultiDevice,
      stream_url: defaultStreamUrl,
    });
    await mirrorToSupabase('screens', 'insert', { row: data });
    if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'screen_create', page_key: 'screens', resource_type: 'screen', resource_id: (data as { id: string }).id, details: { name: body.name || 'TV1' } });
    return Response.json(data);
  }

  const supabase = getServerSupabase();
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (u?.business_id !== businessId) return Response.json({ message: 'Access denied' }, { status: 403 });
  }
  const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
  const businessName = (biz as { name?: string } | null)?.name || 'business';
  const name = body.name || 'TV1';
  const combined = `${businessName} ${name}`;
  const publicSlug = await uniqueSlug(supabase, slugify(combined));
  const allowMultiDevice = user.role === 'super_admin';
  let broadcastCode = generateBroadcastCode();
  for (let i = 0; i < 20; i++) {
    const { data: existing } = await supabase.from('screens').select('id').eq('broadcast_code', broadcastCode).limit(1).maybeSingle();
    if (!existing) break;
    broadcastCode = generateBroadcastCode();
  }
  const defaultStreamUrl = getDefaultStreamUrl(publicSlug);
  const { data, error } = await supabase.from('screens').insert({
    business_id: businessId,
    name,
    location: body.location ?? null,
    public_token: generatePublicToken(),
    public_slug: publicSlug,
    broadcast_code: broadcastCode,
    is_active: true,
    animation_type: 'fade',
    animation_duration: 500,
    template_id: body.template_id ?? null,
    allow_multi_device: allowMultiDevice,
    stream_url: defaultStreamUrl,
  }).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'screen_create', page_key: 'screens', resource_type: 'screen', resource_id: (data as { id: string }).id, details: { name: body.name || 'TV1' } });
  return Response.json(data);
}

/** PATCH /screens/:id */
export async function update(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const allowed = ['name', 'location', 'is_active', 'animation_type', 'animation_duration', 'language_code', 'font_family', 'primary_color', 'background_style', 'background_color', 'background_image_url', 'logo_url', 'template_id', 'frame_type', 'ticker_text', 'ticker_style', 'allow_multi_device', 'stream_url'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  if (useLocalDb()) {
    const screen = await checkScreenAccessLocal(id, user);
    if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
    if (body.name && typeof body.name === 'string') {
      const scr = await queryOne<{ business_id: string }>('SELECT business_id FROM screens WHERE id = $1', [id]);
      if (scr) {
        const biz = await queryOne<{ name?: string }>('SELECT name FROM businesses WHERE id = $1', [scr.business_id]);
        updates.public_slug = await uniqueSlugLocal(slugify(`${biz?.name || 'business'} ${body.name}`));
        if (updates.public_slug) updates.stream_url = getDefaultStreamUrl(updates.public_slug as string);
      }
    }
    if (Object.keys(updates).length === 0) {
      const data = await queryOne('SELECT * FROM screens WHERE id = $1', [id]);
      return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
    }
    const data = await updateLocal('screens', id, updates);
    if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
    await mirrorToSupabase('screens', 'update', { id, row: { ...updates, id } });
    if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'screen_update', page_key: 'screens', resource_type: 'screen', resource_id: id, details: {} });
    return Response.json(data);
  }

  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, id, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  if (body.name && typeof body.name === 'string') {
    const { data: scr } = await supabase.from('screens').select('business_id').eq('id', id).single();
    if (scr) {
      const { data: biz } = await supabase.from('businesses').select('name').eq('id', (scr as { business_id: string }).business_id).single();
      const businessName = (biz as { name?: string } | null)?.name || 'business';
      updates.public_slug = await uniqueSlug(supabase, slugify(`${businessName} ${body.name}`));
      if (updates.public_slug) updates.stream_url = getDefaultStreamUrl(updates.public_slug as string);
    }
  }
  if (Object.keys(updates).length === 0) {
    const { data } = await supabase.from('screens').select('*').eq('id', id).single();
    return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
  }
  const { data, error } = await supabase.from('screens').update(updates).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'screen_update', page_key: 'screens', resource_type: 'screen', resource_id: id, details: {} });
  return Response.json(data);
}

/** DELETE /screens/:id */
export async function remove(id: string, user: JwtPayload): Promise<Response> {
  if (useLocalDb()) {
    const screen = await checkScreenAccessLocal(id, user);
    if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
    await deleteLocal('screens', id);
    await mirrorToSupabase('screens', 'delete', { id });
    if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'screen_delete', page_key: 'screens', resource_type: 'screen', resource_id: id, details: {} });
    return Response.json({ message: 'Screen deleted successfully' });
  }
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, id, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const { error } = await supabase.from('screens').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'screen_delete', page_key: 'screens', resource_type: 'screen', resource_id: id, details: {} });
  return Response.json({ message: 'Screen deleted successfully' });
}

/** GET /screens/:id/menus */
export async function getScreenMenus(screenId: string, user: JwtPayload): Promise<Response> {
  if (useLocalDb()) {
    const screen = await checkScreenAccessLocal(screenId, user);
    if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
    const rows = await queryLocal<Record<string, unknown> & { _m_id?: string; _m_name?: string; _m_desc?: string; _m_slide?: number; _m_active?: boolean }>(
      'SELECT sm.*, m.id as _m_id, m.name as _m_name, m.description as _m_desc, m.slide_duration as _m_slide, m.is_active as _m_active FROM screen_menu sm LEFT JOIN menus m ON m.id = sm.menu_id WHERE sm.screen_id = $1 ORDER BY sm.display_order',
      [screenId]
    );
    const list = rows.map((r) => {
      const { _m_id, _m_name, _m_desc, _m_slide, _m_active, ...rest } = r;
      return { ...rest, menus: { id: _m_id, name: _m_name ?? null, description: _m_desc ?? null, slide_duration: _m_slide ?? 5, is_active: _m_active ?? true } };
    });
    return Response.json(list);
  }
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
  let body: { menu_id?: string; display_order?: number } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const menuId = body.menu_id;
  if (!menuId) return Response.json({ message: 'menu_id required' }, { status: 400 });
  const displayOrder = body.display_order ?? 0;

  if (useLocalDb()) {
    const screen = await checkScreenAccessLocal(screenId, user);
    if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
    const menu = await queryOne<{ business_id: string }>('SELECT business_id FROM menus WHERE id = $1', [menuId]);
    if (!menu || menu.business_id !== screen.business_id)
      return Response.json({ message: 'Menu not found or different business' }, { status: 400 });
    const existing = await queryOne<{ id: string }>('SELECT id FROM screen_menu WHERE screen_id = $1 AND menu_id = $2', [screenId, menuId]);
    if (existing) {
      const updated = await updateLocal('screen_menu', existing.id, { display_order: displayOrder });
      await mirrorToSupabase('screen_menu', 'update', { id: existing.id, row: { ...updated, id: existing.id } });
      return Response.json(updated ?? existing);
    }
    const inserted = await insertLocal('screen_menu', { screen_id: screenId, menu_id: menuId, display_order: displayOrder });
    await mirrorToSupabase('screen_menu', 'insert', { row: inserted });
    return Response.json(inserted);
  }
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const { data: menu } = await supabase.from('menus').select('business_id').eq('id', menuId).single();
  if (!menu || (menu as { business_id: string }).business_id !== screen.business_id)
    return Response.json({ message: 'Menu not found or different business' }, { status: 400 });
  const { data: existing } = await supabase.from('screen_menu').select('id').eq('screen_id', screenId).eq('menu_id', menuId).maybeSingle();
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
  if (useLocalDb()) {
    const screen = await checkScreenAccessLocal(screenId, user);
    if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
    const row = await queryOne<{ id: string }>('SELECT id FROM screen_menu WHERE screen_id = $1 AND menu_id = $2', [screenId, menuId]);
    if (row) {
      await deleteLocal('screen_menu', row.id);
      await getServerSupabase().from('screen_menu').delete().eq('screen_id', screenId).eq('menu_id', menuId);
    }
    return Response.json({ message: 'Menu removed from screen successfully' });
  }
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const { error } = await supabase.from('screen_menu').delete().eq('screen_id', screenId).eq('menu_id', menuId);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ message: 'Menu removed from screen successfully' });
}

/** GET /screens/:id/template-rotations */
export async function getTemplateRotations(screenId: string, user: JwtPayload): Promise<Response> {
  if (useLocalDb()) {
    const screen = await checkScreenAccessLocal(screenId, user);
    if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
    const rotations = await queryLocal(
      `SELECT str.*, t.id as t_id, t.display_name as t_display_name, t.name as t_name, t.description as t_description, t.block_count as t_block_count,
       fet.id as fet_id, fet.name as fet_name
       FROM screen_template_rotations str
       LEFT JOIN templates t ON t.id = str.template_id
       LEFT JOIN full_editor_templates fet ON fet.id = str.full_editor_template_id
       WHERE str.screen_id = $1 AND str.is_active = true ORDER BY str.display_order`,
      [screenId]
    );
    const list = rotations.map((r: Record<string, unknown> & { t_id?: string; t_display_name?: string; t_name?: string; t_description?: string; t_block_count?: number; fet_id?: string; fet_name?: string }) => {
      let template: { id: string; display_name?: string; name?: string; description?: string; block_count?: number } | null = null;
      if (r.t_id != null) {
        template = { id: r.t_id, display_name: r.t_display_name, name: r.t_name, description: r.t_description, block_count: r.t_block_count };
      } else if (r.fet_id != null) {
        template = { id: r.fet_id, display_name: r.fet_name, name: r.fet_name, block_count: 1 };
      }
      return { ...r, template };
    });
    return Response.json(list);
  }
  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  let { data: rotations } = await supabase.from('screen_template_rotations').select('*, template:templates(id, display_name, name, description, block_count)').eq('screen_id', screenId).eq('is_active', true).order('display_order', { ascending: true });
  const feIds = (rotations ?? []).map((r: Record<string, unknown>) => (r as { full_editor_template_id?: string }).full_editor_template_id).filter(Boolean) as string[];
  if (feIds.length > 0) {
    const { data: feTemplates } = await supabase.from('full_editor_templates').select('id, name').in('id', feIds);
    const feMap = new Map((feTemplates ?? []).map((t: { id: string; name?: string }) => [t.id, t]));
    rotations = (rotations ?? []).map((r: Record<string, unknown> & { template?: unknown; full_editor_template_id?: string }) => {
      let template = r.template;
      if (!template && r.full_editor_template_id) {
        const fet = feMap.get(r.full_editor_template_id);
        if (fet) template = { id: fet.id, display_name: fet.name, name: fet.name, block_count: 1 };
      }
      return { ...r, template };
    });
  }
  return Response.json(rotations ?? []);
}

type PublishTemplate = { template_id?: string; display_duration?: number; template_type?: string; full_editor_template_id?: string; transition_effect?: string; transition_duration?: number };

/** POST /screens/:id/publish-templates */
export async function publishTemplates(screenId: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  let body: { templates?: PublishTemplate[]; frame_type?: string; ticker_text?: string; ticker_style?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const templates = (body.templates ?? []) as PublishTemplate[];
  if (templates.length === 0) return Response.json({ message: 'At least one template required' }, { status: 400 });

  // Standart kullanıcı (business_user) için kısıtlamalar: gösterim süresi min 30 sn, geçiş süresi max 5000 ms (geçiş efekti serbest)
  const isRegularUser = user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'tv_user';
  if (isRegularUser) {
    for (const t of templates) {
      const dur = t.display_duration ?? 5;
      if (dur < 30) return Response.json({ message: 'Gösterim süresi en az 30 saniye olmalıdır.' }, { status: 400 });
      const transDur = t.transition_duration ?? 1400;
      if (transDur > 5000) return Response.json({ message: 'Geçiş süresi en fazla 5000 ms olabilir.' }, { status: 400 });
    }
  }

  const first = templates[0];
  const isFirstFullEditor = first.template_type === 'full_editor' || !!first.full_editor_template_id;

  if (useLocalDb()) {
    const screen = await checkScreenAccessLocal(screenId, user);
    if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
    const skipSubCheck = user.role === 'admin' || user.role === 'super_admin' || user.role === 'tv_user';
    if (!skipSubCheck && !(await isSubscriptionActiveLocal(screen.business_id))) return Response.json({ message: 'Subscription expired or payment failed. Renew your subscription to broadcast.' }, { status: 403 });
    await runLocal('DELETE FROM screen_template_rotations WHERE screen_id = $1', [screenId]);
    await runLocal('DELETE FROM screen_blocks WHERE screen_id = $1', [screenId]);
    await updateLocal('screens', screenId, { template_id: isFirstFullEditor ? null : first.template_id ?? null, is_active: true });
    if (!isFirstFullEditor && first.template_id) {
      const tBlocks = await queryLocal<{ id: string; block_index: number; position_x?: number; position_y?: number; width?: number; height?: number }>('SELECT id, block_index, position_x, position_y, width, height FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [first.template_id]);
      for (const tb of tBlocks) {
        await insertLocal('screen_blocks', {
          screen_id: screenId,
          template_block_id: tb.id,
          display_order: tb.block_index,
          is_active: true,
          position_x: tb.position_x,
          position_y: tb.position_y,
          width: tb.width,
          height: tb.height,
        });
      }
    }
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const isFe = t.template_type === 'full_editor' || !!t.full_editor_template_id;
      const row: Record<string, unknown> = {
        screen_id: screenId,
        template_id: isFe ? null : (t.template_id ?? null),
        display_duration: t.display_duration ?? 10,
        display_order: i,
        is_active: true,
        transition_effect: t.transition_effect ?? 'fade',
        transition_duration: t.transition_duration ?? 1400,
      };
      if (isFe && t.full_editor_template_id) {
        row.template_type = 'full_editor';
        row.full_editor_template_id = t.full_editor_template_id;
      }
      await insertLocal('screen_template_rotations', row);
    }
    const frameUpdates: Record<string, unknown> = {};
    if (body.frame_type !== undefined) frameUpdates.frame_type = body.frame_type;
    if (body.ticker_text !== undefined) frameUpdates.ticker_text = body.ticker_text;
    if (body.ticker_style !== undefined) frameUpdates.ticker_style = body.ticker_style;
    if (Object.keys(frameUpdates).length > 0) await updateLocal('screens', screenId, frameUpdates);
    const sb = getServerSupabase();
    let sbRes = await sb.from('screen_template_rotations').delete().eq('screen_id', screenId);
    if (sbRes.error) return Response.json({ message: sbRes.error.message || 'Failed to clear rotations' }, { status: 500 });
    sbRes = await sb.from('screen_blocks').delete().eq('screen_id', screenId);
    if (sbRes.error) return Response.json({ message: sbRes.error.message || 'Failed to clear blocks' }, { status: 500 });
    sbRes = await sb.from('screens').update({ template_id: isFirstFullEditor ? null : first.template_id ?? null, is_active: true }).eq('id', screenId);
    if (sbRes.error) return Response.json({ message: sbRes.error.message || 'Failed to update screen' }, { status: 500 });
    if (!isFirstFullEditor && first.template_id) {
      const tBlocks = await queryLocal<{ id: string; block_index: number; position_x?: number; position_y?: number; width?: number; height?: number }>('SELECT id, block_index, position_x, position_y, width, height FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [first.template_id]);
      for (const tb of tBlocks) {
        sbRes = await sb.from('screen_blocks').insert({ screen_id: screenId, template_block_id: tb.id, display_order: tb.block_index, is_active: true, position_x: tb.position_x, position_y: tb.position_y, width: tb.width, height: tb.height });
        if (sbRes.error) return Response.json({ message: sbRes.error.message || 'Failed to insert screen block' }, { status: 500 });
      }
    }
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const isFe = t.template_type === 'full_editor' || !!t.full_editor_template_id;
      const rot: Record<string, unknown> = {
        screen_id: screenId,
        template_id: isFe ? null : (t.template_id ?? null),
        display_duration: t.display_duration ?? 10,
        display_order: i,
        is_active: true,
        transition_effect: t.transition_effect ?? 'fade',
        transition_duration: t.transition_duration ?? 1400,
      };
      if (isFe && t.full_editor_template_id) {
        rot.template_type = 'full_editor';
        rot.full_editor_template_id = t.full_editor_template_id;
      }
      sbRes = await sb.from('screen_template_rotations').insert(rot);
      if (sbRes.error) return Response.json({ message: sbRes.error.message || 'Template yayınlanamadı.' }, { status: 500 });
    }
    if (Object.keys(frameUpdates).length > 0) {
      sbRes = await sb.from('screens').update(frameUpdates).eq('id', screenId);
      if (sbRes.error) return Response.json({ message: sbRes.error.message || 'Failed to update screen options' }, { status: 500 });
    }
    return Response.json({ message: 'Templates published successfully', count: templates.length });
  }

  const supabase = getServerSupabase();
  const screen = await checkScreenAccess(supabase, screenId, user);
  if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const skipSubCheck = user.role === 'admin' || user.role === 'super_admin' || user.role === 'tv_user';
  if (!skipSubCheck) {
    const active = await isSubscriptionActive(supabase, screen.business_id);
    if (!active) return Response.json({ message: 'Subscription expired or payment failed. Renew your subscription to broadcast.' }, { status: 403 });
  }
  let res = await supabase.from('screen_template_rotations').delete().eq('screen_id', screenId);
  if (res.error) return Response.json({ message: res.error.message || 'Failed to clear rotations' }, { status: 500 });
  res = await supabase.from('screen_blocks').delete().eq('screen_id', screenId);
  if (res.error) return Response.json({ message: res.error.message || 'Failed to clear blocks' }, { status: 500 });
  res = await supabase.from('screens').update({ template_id: isFirstFullEditor ? null : first.template_id ?? null, is_active: true }).eq('id', screenId);
  if (res.error) return Response.json({ message: res.error.message || 'Failed to update screen' }, { status: 500 });
  if (!isFirstFullEditor && first.template_id) {
    const { data: tBlocks } = await supabase.from('template_blocks').select('id, block_index, position_x, position_y, width, height').eq('template_id', first.template_id).order('block_index', { ascending: true });
    for (const tb of tBlocks ?? []) {
      const row = tb as { id: string; block_index: number; position_x?: number; position_y?: number; width?: number; height?: number };
      res = await supabase.from('screen_blocks').insert({
        screen_id: screenId,
        template_block_id: row.id,
        display_order: row.block_index,
        is_active: true,
        position_x: row.position_x ?? 0,
        position_y: row.position_y ?? 0,
        width: row.width ?? 100,
        height: row.height ?? 100,
      });
      if (res.error) return Response.json({ message: res.error.message || 'Failed to insert screen block' }, { status: 500 });
    }
  }
  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    const isFe = t.template_type === 'full_editor' || !!t.full_editor_template_id;
    const rot: Record<string, unknown> = {
      screen_id: screenId,
      template_id: isFe ? null : (t.template_id ?? null),
      display_duration: t.display_duration ?? 10,
      display_order: i,
      is_active: true,
      transition_effect: t.transition_effect ?? 'fade',
      transition_duration: t.transition_duration ?? 1400,
    };
    if (isFe && t.full_editor_template_id) {
      rot.template_type = 'full_editor';
      rot.full_editor_template_id = t.full_editor_template_id;
    }
    res = await supabase.from('screen_template_rotations').insert(rot);
    if (res.error) {
      return Response.json(
        { message: res.error.message || 'Template yayınlanamadı. Veritabanı migration\'larını çalıştırdığınızdan emin olun (transition_effect, full_editor_template_id).' },
        { status: 500 }
      );
    }
  }
  const frameUpdates: Record<string, unknown> = {};
  if (body.frame_type !== undefined) frameUpdates.frame_type = body.frame_type;
  if (body.ticker_text !== undefined) frameUpdates.ticker_text = body.ticker_text;
  if (body.ticker_style !== undefined) frameUpdates.ticker_style = body.ticker_style;
  if (Object.keys(frameUpdates).length > 0) {
    res = await supabase.from('screens').update(frameUpdates).eq('id', screenId);
    if (res.error) return Response.json({ message: res.error.message || 'Failed to update screen options' }, { status: 500 });
  }
  return Response.json({ message: 'Templates published successfully', count: templates.length });
}

/** POST /screens/:id/stop-publishing */
export async function stopPublishing(screenId: string, user: JwtPayload): Promise<Response> {
  if (useLocalDb()) {
    const screen = await checkScreenAccessLocal(screenId, user);
    if (!screen) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
    await updateLocal('screens', screenId, { is_active: false });
    await runLocal('UPDATE screen_template_rotations SET is_active = false WHERE screen_id = $1', [screenId]);
    await mirrorToSupabase('screens', 'update', { id: screenId, row: { is_active: false, id: screenId } });
    await getServerSupabase().from('screen_template_rotations').update({ is_active: false }).eq('screen_id', screenId);
    return Response.json({ message: 'Publishing stopped successfully' });
  }
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
  const stale = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  if (useLocalDb()) {
    const viewers = await queryLocal<{ screen_id: string }>('SELECT screen_id FROM display_viewers WHERE last_seen_at > $1', [stale]);
    const byScreen: Record<string, number> = {};
    for (const v of viewers) {
      byScreen[v.screen_id] = (byScreen[v.screen_id] ?? 0) + 1;
    }
    const screenIds = Object.keys(byScreen).filter((sid) => (byScreen[sid] ?? 0) > 1);
    if (screenIds.length === 0) return Response.json([]);
    const bizRows = await queryLocal<{ id: string; name: string }>('SELECT id, name FROM businesses', []);
    const bizMap = Object.fromEntries(bizRows.map((b) => [b.id, b.name]));
    const scrWithBiz = await queryLocal<{ id: string; name: string; business_id: string }>('SELECT id, name, business_id FROM screens WHERE id = ANY($1::uuid[])', [screenIds]);
    const list = scrWithBiz.map((s) => ({ screen_id: s.id, screen_name: s.name, business_name: bizMap[s.business_id] ?? null, active_viewer_count: byScreen[s.id] ?? 0 }));
    return Response.json(list);
  }
  const supabase = getServerSupabase();
  const { data: viewers } = await supabase.from('display_viewers').select('screen_id').gt('last_seen_at', stale);
  const byScreen: Record<string, number> = {};
  for (const v of viewers ?? []) {
    const sid = (v as { screen_id: string }).screen_id;
    byScreen[sid] = (byScreen[sid] ?? 0) + 1;
  }
  const screenIds = Object.keys(byScreen).filter((sid) => (byScreen[sid] ?? 0) > 1);
  if (screenIds.length === 0) return Response.json([]);
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

/** POST /screens/fix-names - TV isimlerini TV1, TV2, TV3... düzelt */
export async function fixNames(request: NextRequest, user: JwtPayload): Promise<Response> {
  let body: { business_id?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    body = {};
  }
  const businessId = body.business_id;

  if (businessId) {
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return Response.json({ message: 'Yetkisiz' }, { status: 403 });
    }
    if (user.role === 'admin') {
      let userBizId: string | null = null;
      if (useLocalDb()) {
        const u = await queryOne<{ business_id: string }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
        userBizId = u?.business_id ?? null;
      } else {
        const { data: u } = await getServerSupabase().from('users').select('business_id').eq('id', user.userId).single();
        userBizId = (u as { business_id?: string } | null)?.business_id ?? null;
      }
      if (userBizId !== businessId) {
        return Response.json({ message: 'Bu işletmeye erişim yok' }, { status: 403 });
      }
    }
  } else {
    if (user.role !== 'super_admin') {
      return Response.json({ message: 'Sadece süper admin tüm ekran isimlerini düzeltebilir' }, { status: 403 });
    }
  }

  async function fixForBusiness(bid: string): Promise<{ business_id: string; updated: number }> {
    const biz = await queryOne<{ name: string }>('SELECT name FROM businesses WHERE id = $1', [bid]);
    const businessName = biz?.name || 'business';
    const screensList = await queryLocal<{ id: string; name: string }>(
      'SELECT id, name FROM screens WHERE business_id = $1 ORDER BY created_at ASC, id ASC',
      [bid]
    );
    let updated = 0;
    for (let i = 0; i < screensList.length; i++) {
      const s = screensList[i];
      const newName = `TV${i + 1}`;
      if (s.name === newName) continue;
      const slug = await uniqueSlugLocal(slugify(`${businessName} ${newName}`));
      await runLocal('UPDATE screens SET name = $1, public_slug = $2, updated_at = NOW() WHERE id = $3', [newName, slug, s.id]);
      updated++;
    }
    return { business_id: bid, updated };
  }

  if (useLocalDb()) {
    if (businessId) {
      const result = await fixForBusiness(businessId);
      return Response.json(result);
    }
    const bizIds = await queryLocal<{ business_id: string }>('SELECT DISTINCT business_id FROM screens WHERE business_id IS NOT NULL', []);
    const results: { business_id: string; updated: number }[] = [];
    for (const row of bizIds) {
      results.push(await fixForBusiness(row.business_id));
    }
    return Response.json(results);
  }

  const supabase = getServerSupabase();
  if (businessId) {
    const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
    const businessName = (biz as { name?: string } | null)?.name || 'business';
    const { data: screensList } = await supabase.from('screens').select('id, name').eq('business_id', businessId).order('created_at', { ascending: true });
    let updated = 0;
    for (let i = 0; i < (screensList ?? []).length; i++) {
      const s = screensList![i] as { id: string; name: string };
      const newName = `TV${i + 1}`;
      if (s.name === newName) continue;
      const slug = await uniqueSlug(supabase, slugify(`${businessName} ${newName}`));
      await supabase.from('screens').update({ name: newName, public_slug: slug, updated_at: new Date().toISOString() }).eq('id', s.id);
      updated++;
    }
    return Response.json({ business_id: businessId, updated });
  }

  const { data: bizRows } = await supabase.from('screens').select('business_id').not('business_id', 'is', null);
  const bizIds = Array.from(new Set((bizRows ?? []).map((r: { business_id: string }) => r.business_id)));
  const results: { business_id: string; updated: number }[] = [];
  for (const bid of bizIds) {
    const { data: biz } = await supabase.from('businesses').select('name').eq('id', bid).single();
    const businessName = (biz as { name?: string } | null)?.name || 'business';
    const { data: screensList } = await supabase.from('screens').select('id, name').eq('business_id', bid).order('created_at', { ascending: true });
    let updated = 0;
    for (let i = 0; i < (screensList ?? []).length; i++) {
      const s = screensList![i] as { id: string; name: string };
      const newName = `TV${i + 1}`;
      if (s.name === newName) continue;
      const slug = await uniqueSlug(supabase, slugify(`${businessName} ${newName}`));
      await supabase.from('screens').update({ name: newName, public_slug: slug, updated_at: new Date().toISOString() }).eq('id', s.id);
      updated++;
    }
    results.push({ business_id: bid, updated });
  }
  return Response.json(results);
}
