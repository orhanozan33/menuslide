import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { useLocalDb, queryLocal, queryOne, insertLocal, updateLocal, deleteLocal, mirrorToSupabase } from '@/lib/api-backend/db-local';

/** GET /template-blocks/template/:templateId */
export async function findByTemplate(templateId: string): Promise<Response> {
  if (useLocalDb()) {
    const data = await queryLocal('SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index', [templateId]);
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('template_blocks').select('*').eq('template_id', templateId).order('block_index', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /template-blocks/:id */
export async function findOne(id: string): Promise<Response> {
  if (useLocalDb()) {
    const data = await queryOne('SELECT * FROM template_blocks WHERE id = $1', [id]);
    return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('template_blocks').select('*').eq('id', id).maybeSingle();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
}

/** POST /template-blocks */
export async function create(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (useLocalDb()) {
    try {
      const data = await insertLocal('template_blocks', body);
      await mirrorToSupabase('template_blocks', 'insert', { row: data });
      return Response.json(data);
    } catch (e: any) {
      return Response.json({ message: e?.message || 'Insert failed' }, { status: e?.code === '23505' ? 409 : 500 });
    }
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('template_blocks').insert(body).select().single();
  if (error) return Response.json({ message: error.message }, { status: error.code === '23505' ? 409 : 500 });
  return Response.json(data);
}

/** PATCH /template-blocks/:id */
export async function update(id: string, request: NextRequest): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (useLocalDb()) {
    const data = await updateLocal('template_blocks', id, body);
    if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
    await mirrorToSupabase('template_blocks', 'update', { id, row: { ...body, id } });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('template_blocks').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** DELETE /template-blocks/:id */
export async function remove(id: string): Promise<Response> {
  if (useLocalDb()) {
    await deleteLocal('template_blocks', id);
    await mirrorToSupabase('template_blocks', 'delete', { id });
    return Response.json({ success: true });
  }
  const supabase = getServerSupabase();
  const { error } = await supabase.from('template_blocks').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ success: true });
}

/** POST /template-blocks/batch-update */
export async function batchUpdate(request: NextRequest): Promise<Response> {
  let body: { updates?: Array<{ id: string; updates: Record<string, unknown> }> } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const updates = body.updates ?? [];
  const results: unknown[] = [];
  if (useLocalDb()) {
    for (const { id, updates: blockUpdates } of updates) {
      const data = await updateLocal('template_blocks', id, blockUpdates);
      if (data) {
        await mirrorToSupabase('template_blocks', 'update', { id, row: { ...blockUpdates, id } });
        results.push(data);
      }
    }
    return Response.json(results);
  }
  const supabase = getServerSupabase();
  for (const { id, updates: blockUpdates } of updates) {
    const { data, error } = await supabase.from('template_blocks').update(blockUpdates).eq('id', id).select().single();
    if (error) return Response.json({ message: error.message }, { status: 500 });
    results.push(data);
  }
  return Response.json(results);
}
