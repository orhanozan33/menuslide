import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, insertLocal, queryLocal, queryOne, updateLocal, deleteLocal, runLocal, mirrorToSupabase } from '@/lib/api-backend/db-local';
import { insertAdminActivityLog } from '@/lib/api-backend/admin-activity-log';
import { regenerateSlidesForTemplate } from '@/lib/generate-slides-internal';

/** POST /templates */
export async function create(request: NextRequest, user: JwtPayload): Promise<Response> {
  let body: { name?: string; display_name?: string; description?: string; block_count?: number; preview_image_url?: string; is_active?: boolean; business_id?: string; target_user_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  // Admin ve super_admin her zaman sistem şablonu oluşturur; kullanıcılar kendi şablonlarını oluşturur
  const isAdmin = user.role === 'super_admin' || user.role === 'admin';
  const scope = isAdmin ? 'system' : 'user';
  const blockCount = Math.min(16, Math.max(1, body.block_count ?? 1));
  const row = {
    name: body.name || body.display_name || 'Template',
    display_name: body.display_name || body.name || 'Template',
    description: body.description ?? null,
    block_count: blockCount,
    preview_image_url: body.preview_image_url ?? null,
    is_active: body.is_active ?? true,
    scope,
    is_system: isAdmin,
    created_by: user.userId,
  };

  if (useLocalDb()) {
    try {
      const template = await insertLocal('templates', row) as { id: string };
      await mirrorToSupabase('templates', 'insert', { row: { ...row, id: template.id } });
      for (let i = 0; i < blockCount; i++) {
        const blockRow = { template_id: template.id, block_index: i, position_x: 0, position_y: 0, width: 100, height: 100 };
        const inserted = await insertLocal('template_blocks', blockRow);
        await mirrorToSupabase('template_blocks', 'insert', { row: inserted });
      }
      const blocks = await queryLocal('SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [template.id]);
      if (isAdmin) await insertAdminActivityLog(user, { action_type: 'template_create', page_key: 'templates', resource_type: 'template', resource_id: template.id, details: { name: row.display_name } });
      return Response.json({ ...template, template_blocks: blocks });
    } catch (e: any) {
      return Response.json({ message: e?.message || 'Insert failed' }, { status: 500 });
    }
  }

  const supabase = getServerSupabase();
  const { data: template, error: insertErr } = await supabase.from('templates').insert(row).select().single();
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
  if (isAdmin) await insertAdminActivityLog(user, { action_type: 'template_create', page_key: 'templates', resource_type: 'template', resource_id: template.id, details: { name: row.display_name } });
  return Response.json(withBlocks ?? template);
}

/** PATCH /templates/:id */
export async function update(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const allowed = ['name', 'display_name', 'description', 'block_count', 'preview_image_url', 'is_active'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  if (useLocalDb()) {
    const t = await queryOne<{ created_by: string | null }>('SELECT created_by FROM templates WHERE id = $1', [id]);
    if (!t) return Response.json({ message: 'Not found' }, { status: 404 });
    if (user.role === 'business_user' && t.created_by !== user.userId) return Response.json({ message: 'Access denied' }, { status: 403 });
    if (Object.keys(updates).length === 0) {
      const data = await queryOne('SELECT * FROM templates WHERE id = $1', [id]);
      return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
    }
    const data = await updateLocal('templates', id, updates);
    if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
    await mirrorToSupabase('templates', 'update', { id, row: { ...updates, id } });
    await insertAdminActivityLog(user, { action_type: 'template_update', page_key: 'templates', resource_type: 'template', resource_id: id, details: { name: String(updates.display_name || updates.name || '') } });
    void regenerateSlidesForTemplate(id).catch((e) => console.error('[templates update] regenerateSlidesForTemplate failed', e));
    return Response.json(data);
  }

  const supabase = getServerSupabase();
  if (user.role === 'business_user') {
    const { data: t } = await supabase.from('templates').select('created_by').eq('id', id).single();
    if (t?.created_by !== user.userId) return Response.json({ message: 'Access denied' }, { status: 403 });
  }
  if (Object.keys(updates).length === 0) {
    const { data } = await supabase.from('templates').select('*').eq('id', id).single();
    return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
  }
  const { data, error } = await supabase.from('templates').update(updates).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  await insertAdminActivityLog(user, { action_type: 'template_update', page_key: 'templates', resource_type: 'template', resource_id: id, details: { name: String(updates.display_name || updates.name || '') } });
  void regenerateSlidesForTemplate(id).catch((e) => console.error('[templates update] regenerateSlidesForTemplate failed', e));
  return Response.json(data);
}

/** DELETE /templates/:id */
export async function remove(id: string, user: JwtPayload): Promise<Response> {
  if (useLocalDb()) {
    const t = await queryOne<{ is_system: boolean; created_by: string | null }>('SELECT is_system, created_by FROM templates WHERE id = $1', [id]);
    if (!t) return Response.json({ message: 'Not found' }, { status: 404 });
    if (t.is_system && user.role !== 'super_admin' && user.role !== 'admin')
      return Response.json({ message: 'Cannot delete system templates' }, { status: 400 });
    if (user.role === 'business_user' && t.created_by !== user.userId)
      return Response.json({ message: 'Access denied' }, { status: 403 });
    await deleteLocal('templates', id);
    await mirrorToSupabase('templates', 'delete', { id });
    await insertAdminActivityLog(user, { action_type: 'template_delete', page_key: 'templates', resource_type: 'template', resource_id: id, details: {} });
    return Response.json({ message: 'Template deleted successfully' });
  }
  const supabase = getServerSupabase();
  const { data: t } = await supabase.from('templates').select('is_system, created_by').eq('id', id).single();
  if (!t) return Response.json({ message: 'Not found' }, { status: 404 });
  if ((t as { is_system: boolean }).is_system && user.role !== 'super_admin' && user.role !== 'admin')
    return Response.json({ message: 'Cannot delete system templates' }, { status: 400 });
  if (user.role === 'business_user' && (t as { created_by: string | null }).created_by !== user.userId)
    return Response.json({ message: 'Access denied' }, { status: 403 });
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  await insertAdminActivityLog(user, { action_type: 'template_delete', page_key: 'templates', resource_type: 'template', resource_id: id, details: {} });
  return Response.json({ message: 'Template deleted successfully' });
}

/** GET /templates/:id - single template (business_user: created_by OR business_id) */
export async function findOne(id: string, user: JwtPayload): Promise<Response> {
  if (useLocalDb()) {
    const t = await queryOne<{ created_by: string | null; business_id: string | null }>(
      'SELECT id, created_by, business_id FROM templates WHERE id = $1',
      [id]
    );
    if (!t) return Response.json({ message: 'Not found' }, { status: 404 });
    if (user.role === 'business_user') {
      const u = await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
      const ok = t.created_by === user.userId || (u?.business_id && t.business_id === u.business_id);
      if (!ok) return Response.json({ message: 'Not found' }, { status: 404 });
    }
    const data = await queryOne('SELECT * FROM templates WHERE id = $1', [id]);
    return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
  }
  const supabase = getServerSupabase();
  const { data: t, error: err } = await supabase.from('templates').select('id, created_by, business_id').eq('id', id).maybeSingle();
  if (err) return Response.json({ message: err.message }, { status: 500 });
  if (!t) return Response.json({ message: 'Not found' }, { status: 404 });
  if (user.role === 'business_user') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    const ok = (t as { created_by: string | null }).created_by === user.userId || (u?.business_id && (t as { business_id: string | null }).business_id === u.business_id);
    if (!ok) return Response.json({ message: 'Not found' }, { status: 404 });
  }
  const { data } = await supabase.from('templates').select('*').eq('id', id).single();
  return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
}

/** GET /templates/:id/blocks - returns template_blocks for template */
export async function getTemplateBlocks(templateId: string): Promise<Response> {
  if (useLocalDb()) {
    try {
      const data = await queryLocal('SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [templateId]);
      return Response.json(data);
    } catch (e: any) {
      if (e?.message?.includes('does not exist') || e?.code === '42P01') return Response.json([]);
      throw e;
    }
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('template_blocks')
    .select('*')
    .eq('template_id', templateId)
    .order('block_index', { ascending: true });
  if (error) {
    if (error.message?.includes('could not find the table') || error.message?.includes('schema cache') || error.code === '42P01') {
      return Response.json([]);
    }
    return Response.json({ message: error.message }, { status: 500 });
  }
  return Response.json(data ?? []);
}

/** GET /templates/scope/:scope (system | user) */
export async function findByScope(scope: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('business_id');
  const userIdParam = searchParams.get('user_id');
  const targetUserId = (user.role === 'super_admin' || user.role === 'admin') && userIdParam ? userIdParam : user.userId;

  if (useLocalDb()) {
    let sql = 'SELECT * FROM templates WHERE scope = $1 AND is_active = true';
    const params: unknown[] = [scope];
    if (scope === 'system') {
      sql += ' AND created_by IS NOT NULL';
    }
    if (scope === 'user' && businessId) {
      params.push(businessId);
      sql += ` AND business_id = $${params.length}`;
    }
    if (scope === 'user' && targetUserId) {
      params.push(targetUserId);
      sql += ` AND created_by = $${params.length}`;
    } else if (user.role !== 'super_admin' && user.role !== 'admin') {
      params.push(targetUserId);
      sql += ` AND (created_by = $${params.length} OR (scope = 'system' AND created_by IS NOT NULL))`;
    }
    sql += ' ORDER BY block_count ASC, name ASC';
    const data = await queryLocal(sql, params);
    return Response.json(data);
  }

  const supabase = getServerSupabase();
  let q = supabase.from('templates').select('*').eq('scope', scope).eq('is_active', true);
  if (scope === 'system') q = q.not('created_by', 'is', null);
  if (scope === 'user' && businessId) q = q.eq('business_id', businessId);
  if (scope === 'user' && targetUserId) q = q.eq('created_by', targetUserId);
  else if (user.role !== 'super_admin' && user.role !== 'admin') q = q.or(`created_by.eq.${targetUserId},and(scope.eq.system,created_by.not.is.null)`);
  const { data, error } = await q.order('block_count', { ascending: true }).order('name', { ascending: true });
  if (error) {
    if (error.message?.includes('could not find the table') || error.message?.includes('schema cache') || error.code === '42P01') {
      return Response.json([]);
    }
    return Response.json({ message: error.message }, { status: 500 });
  }
  return Response.json(data ?? []);
}

/** POST /templates/apply - apply template to screen */
export async function applyToScreen(request: NextRequest, user: JwtPayload): Promise<Response> {
  let body: { screen_id?: string; template_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const screenId = body.screen_id;
  const templateId = body.template_id;
  if (!screenId || !templateId) return Response.json({ message: 'screen_id and template_id required' }, { status: 400 });
  if (useLocalDb()) {
    const screen = await queryOne<{ business_id: string }>('SELECT business_id FROM screens WHERE id = $1', [screenId]);
    if (!screen) return Response.json({ message: 'Screen not found' }, { status: 404 });
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      const u = await queryOne<{ business_id: string }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
      if (u?.business_id !== screen.business_id) return Response.json({ message: 'Access denied' }, { status: 403 });
    }
    await runLocal('DELETE FROM screen_blocks WHERE screen_id = $1', [screenId]);
    const tBlocks = await queryLocal<{ id: string; block_index: number; position_x?: number; position_y?: number; width?: number; height?: number }>('SELECT id, block_index, position_x, position_y, width, height FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [templateId]);
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
    await updateLocal('screens', screenId, { template_id: templateId });
    const sb = getServerSupabase();
    await sb.from('screen_blocks').delete().eq('screen_id', screenId);
    for (const tb of tBlocks) {
      await sb.from('screen_blocks').insert({ screen_id: screenId, template_block_id: tb.id, display_order: tb.block_index, is_active: true, position_x: tb.position_x, position_y: tb.position_y, width: tb.width, height: tb.height });
    }
    await sb.from('screens').update({ template_id: templateId }).eq('id', screenId);
    await insertAdminActivityLog(user, { action_type: 'template_apply', page_key: 'templates', resource_type: 'template', resource_id: templateId, details: { screen_id: screenId } });
    return Response.json({ message: 'Template applied' });
  }
  const supabase = getServerSupabase();
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
  await insertAdminActivityLog(user, { action_type: 'template_apply', page_key: 'templates', resource_type: 'template', resource_id: templateId, details: { screen_id: screenId } });
  return Response.json({ message: 'Template applied' });
}

/** POST /templates/:id/duplicate */
export async function duplicate(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (useLocalDb()) {
    const orig = await queryOne<Record<string, unknown>>('SELECT * FROM templates WHERE id = $1', [id]);
    if (!orig) return Response.json({ message: 'Template not found' }, { status: 404 });
    const created = await insertLocal('templates', {
      name: body.name || (String(orig.name) + ' (Kopya)'),
      display_name: body.name || (String(orig.display_name) + ' (Kopya)'),
      description: orig.description,
      block_count: orig.block_count,
      preview_image_url: orig.preview_image_url,
      canvas_design: orig.canvas_design ?? null,
      is_active: true,
      scope: 'user',
      created_by: user.userId,
    }) as { id: string };
    await mirrorToSupabase('templates', 'insert', { row: created });
    const blocks = await queryLocal<Record<string, unknown> & { id: string }>('SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [id]);
    const oldToNew: Record<string, string> = {};
    for (const bl of blocks) {
      const inserted = await insertLocal('template_blocks', {
        template_id: created.id,
        block_index: bl.block_index,
        position_x: bl.position_x,
        position_y: bl.position_y,
        width: bl.width,
        height: bl.height,
        z_index: bl.z_index,
        animation_type: bl.animation_type,
        animation_duration: bl.animation_duration,
        animation_delay: bl.animation_delay,
        style_config: bl.style_config,
      }) as { id: string };
      oldToNew[bl.id] = inserted.id;
      await mirrorToSupabase('template_blocks', 'insert', { row: inserted });
    }
    const blockIds = Object.keys(oldToNew);
    if (blockIds.length > 0) {
      const contents = await queryLocal<Record<string, unknown> & { template_block_id: string }>(
        'SELECT * FROM template_block_contents WHERE template_block_id = ANY($1::uuid[]) ORDER BY display_order',
        [blockIds]
      );
      for (const c of contents) {
        const newBlockId = oldToNew[c.template_block_id];
        if (!newBlockId) continue;
        const row = {
          template_block_id: newBlockId,
          content_type: c.content_type,
          image_url: c.image_url,
          icon_name: c.icon_name,
          title: c.title,
          description: c.description,
          price: c.price,
          campaign_text: c.campaign_text,
          background_color: c.background_color,
          background_image_url: c.background_image_url,
          text_color: c.text_color,
          style_config: c.style_config,
          menu_item_id: null,
          menu_id: null,
          display_order: c.display_order ?? 0,
          is_active: c.is_active ?? true,
        };
        const ins = await insertLocal('template_block_contents', row);
        await mirrorToSupabase('template_block_contents', 'insert', { row: ins });
      }
    }
    const withBlocks = await queryLocal('SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [created.id]);
    await insertAdminActivityLog(user, { action_type: 'template_duplicate', page_key: 'templates', resource_type: 'template', resource_id: created.id, details: { name: body.name || String(orig.display_name), source_id: id } });
    return Response.json({ ...created, template_blocks: withBlocks });
  }
  const supabase = getServerSupabase();
  const { data: orig } = await supabase.from('templates').select('*').eq('id', id).single();
  if (!orig) return Response.json({ message: 'Template not found' }, { status: 404 });
  const o = orig as Record<string, unknown>;
  const { data: created, error } = await supabase.from('templates').insert({
    name: body.name || (String(o.name) + ' (Kopya)'),
    display_name: body.name || (String(o.display_name) + ' (Kopya)'),
    description: o.description,
    block_count: o.block_count,
    preview_image_url: o.preview_image_url,
    canvas_design: o.canvas_design ?? null,
    is_active: true,
    scope: 'user',
    created_by: user.userId,
  }).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  const { data: blocks } = await supabase.from('template_blocks').select('*').eq('template_id', id).order('block_index', { ascending: true });
  const oldToNew: Record<string, string> = {};
  for (const b of blocks ?? []) {
    const bl = b as Record<string, unknown>;
    const { data: inserted } = await supabase.from('template_blocks').insert({
      template_id: created.id,
      block_index: bl.block_index,
      position_x: bl.position_x,
      position_y: bl.position_y,
      width: bl.width,
      height: bl.height,
      z_index: bl.z_index,
      animation_type: bl.animation_type,
      animation_duration: bl.animation_duration,
      animation_delay: bl.animation_delay,
      style_config: bl.style_config,
    }).select('id').single();
    if (inserted) oldToNew[(bl.id as string)] = (inserted as { id: string }).id;
  }
  const blockIds = Object.keys(oldToNew);
  if (blockIds.length > 0) {
    const { data: contents } = await supabase.from('template_block_contents').select('*').in('template_block_id', blockIds).order('display_order', { ascending: true });
    for (const c of contents ?? []) {
      const ct = c as Record<string, unknown>;
      const newBlockId = oldToNew[ct.template_block_id as string];
      if (!newBlockId) continue;
      await supabase.from('template_block_contents').insert({
        template_block_id: newBlockId,
        content_type: ct.content_type,
        image_url: ct.image_url,
        icon_name: ct.icon_name,
        title: ct.title,
        description: ct.description,
        price: ct.price,
        campaign_text: ct.campaign_text,
        background_color: ct.background_color,
        background_image_url: ct.background_image_url,
        text_color: ct.text_color,
        style_config: ct.style_config,
        menu_item_id: null,
        menu_id: null,
        display_order: ct.display_order ?? 0,
        is_active: ct.is_active ?? true,
      });
    }
  }
  const { data: withBlocks } = await supabase.from('templates').select('*, template_blocks(*)').eq('id', created.id).single();
  await insertAdminActivityLog(user, { action_type: 'template_duplicate', page_key: 'templates', resource_type: 'template', resource_id: created.id, details: { name: body.name || String(o.display_name), source_id: id } });
  return Response.json(withBlocks ?? created);
}

/** POST /templates/:id/copy-to-system - Admin/super_admin: copy user template to system templates for all users */
export async function copyToSystem(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return Response.json({ message: 'Only admin or super_admin can copy templates to system' }, { status: 403 });
  }
  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const baseName = body.name?.trim() || '';

  if (useLocalDb()) {
    const orig = await queryOne<Record<string, unknown>>('SELECT * FROM templates WHERE id = $1', [id]);
    if (!orig) return Response.json({ message: 'Template not found' }, { status: 404 });
    const displayName = String(orig.display_name || orig.name || 'Template');
    const newDisplayName = baseName || displayName.replace(/\s*\([kK]opya\)\s*$/, '').trim();
    const created = await insertLocal('templates', {
      name: baseName || String(orig.name || '').replace(/\s*\([kK]opya\)\s*$/, '').trim() || newDisplayName,
      display_name: newDisplayName,
      description: orig.description,
      block_count: orig.block_count,
      preview_image_url: orig.preview_image_url,
      is_active: true,
      scope: 'system',
      is_system: true,
      created_by: user.userId,
      business_id: null,
      canvas_design: orig.canvas_design ?? null,
    }) as { id: string };
    await mirrorToSupabase('templates', 'insert', { row: created });
    const blocks = await queryLocal<Record<string, unknown> & { id: string }>('SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [id]);
    const oldToNew: Record<string, string> = {};
    for (const bl of blocks) {
      const inserted = await insertLocal('template_blocks', {
        template_id: created.id,
        block_index: bl.block_index,
        position_x: bl.position_x,
        position_y: bl.position_y,
        width: bl.width,
        height: bl.height,
        z_index: bl.z_index,
        animation_type: bl.animation_type,
        animation_duration: bl.animation_duration,
        animation_delay: bl.animation_delay,
        style_config: bl.style_config,
      });
      oldToNew[bl.id] = (inserted as { id: string }).id;
      await mirrorToSupabase('template_blocks', 'insert', { row: inserted });
    }
    const blockIds = Object.keys(oldToNew);
    if (blockIds.length > 0) {
      const contents = await queryLocal<Record<string, unknown> & { template_block_id: string }>(
        'SELECT * FROM template_block_contents WHERE template_block_id = ANY($1::uuid[]) ORDER BY display_order',
        [blockIds]
      );
      for (const c of contents) {
        const newBlockId = oldToNew[c.template_block_id];
        if (!newBlockId) continue;
        const row = {
          template_block_id: newBlockId,
          content_type: c.content_type,
          image_url: c.image_url,
          icon_name: c.icon_name,
          title: c.title,
          description: c.description,
          price: c.price,
          campaign_text: c.campaign_text,
          background_color: c.background_color,
          background_image_url: c.background_image_url,
          text_color: c.text_color,
          style_config: c.style_config,
          menu_item_id: null,
          menu_id: null,
          display_order: c.display_order ?? 0,
          is_active: c.is_active ?? true,
        };
        const ins = await insertLocal('template_block_contents', row);
        await mirrorToSupabase('template_block_contents', 'insert', { row: ins });
      }
    }
    const withBlocks = await queryLocal('SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [created.id]);
    await insertAdminActivityLog(user, { action_type: 'template_copy_system', page_key: 'templates', resource_type: 'template', resource_id: created.id, details: { name: newDisplayName, source_id: id } });
    return Response.json({ ...created, template_blocks: withBlocks });
  }

  const supabase = getServerSupabase();
  const { data: orig } = await supabase.from('templates').select('*').eq('id', id).single();
  if (!orig) return Response.json({ message: 'Template not found' }, { status: 404 });
  const o = orig as Record<string, unknown>;
  const displayName = String(o.display_name || o.name || 'Template');
  const newDisplayName = baseName || displayName.replace(/\s*\([kK]opya\)\s*$/, '').trim();
  const { data: created, error } = await supabase.from('templates').insert({
    name: baseName || (String(o.name || '').replace(/\s*\([kK]opya\)\s*$/, '').trim() || newDisplayName),
    display_name: newDisplayName,
    description: o.description,
    block_count: o.block_count,
    preview_image_url: o.preview_image_url,
    is_active: true,
    scope: 'system',
    is_system: true,
    created_by: user.userId,
    business_id: null,
    canvas_design: o.canvas_design ?? null,
  }).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  const { data: blocks } = await supabase.from('template_blocks').select('*').eq('template_id', id).order('block_index', { ascending: true });
  const oldToNew: Record<string, string> = {};
  for (const b of blocks ?? []) {
    const bl = b as Record<string, unknown>;
    const { data: inserted } = await supabase.from('template_blocks').insert({
      template_id: created.id,
      block_index: bl.block_index,
      position_x: bl.position_x,
      position_y: bl.position_y,
      width: bl.width,
      height: bl.height,
      z_index: bl.z_index,
      animation_type: bl.animation_type,
      animation_duration: bl.animation_duration,
      animation_delay: bl.animation_delay,
      style_config: bl.style_config,
    }).select('id').single();
    if (inserted) oldToNew[(bl.id as string)] = (inserted as { id: string }).id;
  }
  const blockIds = Object.keys(oldToNew);
  if (blockIds.length > 0) {
    const { data: contents } = await supabase.from('template_block_contents').select('*').in('template_block_id', blockIds).order('display_order', { ascending: true });
    for (const c of contents ?? []) {
      const ct = c as Record<string, unknown>;
      const newBlockId = oldToNew[ct.template_block_id as string];
      if (!newBlockId) continue;
      await supabase.from('template_block_contents').insert({
        template_block_id: newBlockId,
        content_type: ct.content_type,
        image_url: ct.image_url,
        icon_name: ct.icon_name,
        title: ct.title,
        description: ct.description,
        price: ct.price,
        campaign_text: ct.campaign_text,
        background_color: ct.background_color,
        background_image_url: ct.background_image_url,
        text_color: ct.text_color,
        style_config: ct.style_config,
        menu_item_id: null,
        menu_id: null,
        display_order: ct.display_order ?? 0,
        is_active: ct.is_active ?? true,
      });
    }
  }
  const { data: withBlocks } = await supabase.from('templates').select('*, template_blocks(*)').eq('id', created.id).single();
  await insertAdminActivityLog(user, { action_type: 'template_copy_system', page_key: 'templates', resource_type: 'template', resource_id: created.id, details: { name: newDisplayName, source_id: id } });
  return Response.json(withBlocks ?? created);
}

/** POST /templates/:id/save-as */
export async function saveAs(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  return duplicate(id, request, user);
}

/** POST /templates/:id/create-menu-from-products - create menu from template block contents */
export async function createMenuFromProducts(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { business_id?: string };
  const bodyBusinessId = body?.business_id ?? null;

  if (useLocalDb()) {
    const template = await queryOne<{ display_name: string }>('SELECT display_name FROM templates WHERE id = $1', [id]);
    if (!template) return Response.json({ message: 'Template not found' }, { status: 404 });
    const u = await queryOne<{ business_id: string }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
    const businessId = u?.business_id ?? bodyBusinessId;
    if (!businessId) {
      return Response.json({ menu: null, productsCount: 0, skipped: true, message: 'Admin users have no business. Create menus from the Menus section for a specific business.' });
    }
    const menu = await insertLocal('menus', {
      business_id: businessId,
      name: `${template.display_name} Menüsü`,
      description: `Template'ten otomatik oluşturulan menü`,
      slide_duration: 5,
      is_active: true,
    });
    await mirrorToSupabase('menus', 'insert', { row: menu });
    return Response.json({ menu, message: 'Menu created' });
  }
  const supabase = getServerSupabase();
  const { data: template } = await supabase.from('templates').select('display_name').eq('id', id).single();
  if (!template) return Response.json({ message: 'Template not found' }, { status: 404 });
  const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
  const businessId = (u as { business_id: string } | null)?.business_id ?? bodyBusinessId;
  if (!businessId) {
    return Response.json({ menu: null, productsCount: 0, skipped: true, message: 'Admin users have no business. Create menus from the Menus section for a specific business.' });
  }
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
