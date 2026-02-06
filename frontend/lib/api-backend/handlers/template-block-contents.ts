import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/** GET /template-block-contents/block/:blockId */
export async function findByBlock(blockId: string): Promise<Response> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('template_block_contents')
    .select('*')
    .eq('template_block_id', blockId)
    .order('display_order', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /template-block-contents/:id */
export async function findOne(id: string): Promise<Response> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('template_block_contents').select('*').eq('id', id).maybeSingle();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
}

/** POST /template-block-contents */
export async function create(request: NextRequest): Promise<Response> {
  const supabase = getServerSupabase();
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (body.style_config && typeof body.style_config === 'string') {
    try {
      body.style_config = JSON.parse(body.style_config);
    } catch {
      // keep as string
    }
  }
  const { data, error } = await supabase.from('template_block_contents').insert(body).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** PATCH /template-block-contents/:id */
export async function update(id: string, request: NextRequest): Promise<Response> {
  const supabase = getServerSupabase();
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { data, error } = await supabase.from('template_block_contents').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** DELETE /template-block-contents/:id */
export async function remove(id: string): Promise<Response> {
  const supabase = getServerSupabase();
  const { error } = await supabase.from('template_block_contents').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ success: true });
}
