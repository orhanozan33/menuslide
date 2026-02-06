import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/** GET /template-blocks/template/:templateId */
export async function findByTemplate(templateId: string): Promise<Response> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('template_blocks')
    .select('*')
    .eq('template_id', templateId)
    .order('block_index', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /template-blocks/:id */
export async function findOne(id: string): Promise<Response> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('template_blocks').select('*').eq('id', id).maybeSingle();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
}

/** POST /template-blocks */
export async function create(request: NextRequest): Promise<Response> {
  const supabase = getServerSupabase();
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { data, error } = await supabase.from('template_blocks').insert(body).select().single();
  if (error) return Response.json({ message: error.message }, { status: error.code === '23505' ? 409 : 500 });
  return Response.json(data);
}

/** PATCH /template-blocks/:id */
export async function update(id: string, request: NextRequest): Promise<Response> {
  const supabase = getServerSupabase();
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { data, error } = await supabase.from('template_blocks').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** DELETE /template-blocks/:id */
export async function remove(id: string): Promise<Response> {
  const supabase = getServerSupabase();
  const { error } = await supabase.from('template_blocks').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ success: true });
}

/** POST /template-blocks/batch-update */
export async function batchUpdate(request: NextRequest): Promise<Response> {
  const supabase = getServerSupabase();
  let body: { updates?: Array<{ id: string; updates: Record<string, unknown> }> } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const updates = body.updates ?? [];
  const results: unknown[] = [];
  for (const { id, updates: blockUpdates } of updates) {
    const { data, error } = await supabase.from('template_blocks').update(blockUpdates).eq('id', id).select().single();
    if (error) return Response.json({ message: error.message }, { status: 500 });
    results.push(data);
  }
  return Response.json(results);
}
