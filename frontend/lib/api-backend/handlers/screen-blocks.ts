import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';

async function checkScreenAccess(supabase: ReturnType<typeof getServerSupabase>, screenId: string, user: JwtPayload): Promise<boolean> {
  const { data: screen } = await supabase.from('screens').select('business_id').eq('id', screenId).single();
  if (!screen) return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
  return u?.business_id === (screen as { business_id: string }).business_id;
}

/** GET /screen-blocks/screen/:screenId */
export async function findByScreen(screenId: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const ok = await checkScreenAccess(supabase, screenId, user);
  if (!ok) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  const { data, error } = await supabase.from('screen_blocks').select('*, template_blocks(*)').eq('screen_id', screenId).order('display_order', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /screen-blocks/:id */
export async function findOne(id: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: block } = await supabase.from('screen_blocks').select('screen_id').eq('id', id).single();
  if (!block) return Response.json({ message: 'Not found' }, { status: 404 });
  const ok = await checkScreenAccess(supabase, (block as { screen_id: string }).screen_id, user);
  if (!ok) return Response.json({ message: 'Access denied' }, { status: 403 });
  const { data } = await supabase.from('screen_blocks').select('*, template_blocks(*)').eq('id', id).single();
  return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
}

/** PATCH /screen-blocks/:id */
export async function update(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: block } = await supabase.from('screen_blocks').select('screen_id').eq('id', id).single();
  if (!block) return Response.json({ message: 'Not found' }, { status: 404 });
  const ok = await checkScreenAccess(supabase, (block as { screen_id: string }).screen_id, user);
  if (!ok) return Response.json({ message: 'Access denied' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { data, error } = await supabase.from('screen_blocks').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** POST /screen-blocks/batch-update */
export async function batchUpdate(request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  let body: { updates?: Array<{ id: string; position_x?: number; position_y?: number; width?: number; height?: number; z_index?: number }> } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const updates = body.updates ?? [];
  const results: unknown[] = [];
  for (const { id, ...rest } of updates) {
    const { data: block } = await supabase.from('screen_blocks').select('screen_id').eq('id', id).single();
    if (!block) continue;
    const ok = await checkScreenAccess(supabase, (block as { screen_id: string }).screen_id, user);
    if (!ok) continue;
    const { data } = await supabase.from('screen_blocks').update(rest).eq('id', id).select().single();
    if (data) results.push(data);
  }
  return Response.json(results);
}

/** POST /screen-blocks/screen/:screenId/layer-order */
export async function updateLayerOrder(screenId: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const ok = await checkScreenAccess(supabase, screenId, user);
  if (!ok) return Response.json({ message: 'Not found or access denied' }, { status: 404 });
  let body: { block_ids?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const blockIds = body.block_ids ?? [];
  for (let i = 0; i < blockIds.length; i++) {
    await supabase.from('screen_blocks').update({ z_index: i }).eq('id', blockIds[i]).eq('screen_id', screenId);
  }
  return Response.json({ success: true });
}
