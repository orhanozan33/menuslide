import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';

/** GET /content-library/categories */
export async function getCategories(): Promise<Response> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('content_library_categories').select('*').order('display_order', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /content-library/my-uploads */
export async function getMyUploads(user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('content_library').select('*').eq('uploaded_by', user.userId).eq('is_active', true).order('created_at', { ascending: false });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /content-library/user-uploads - admin */
export async function getUserUploads(user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('content_library').select('*, users!content_library_uploaded_by_fkey(email)').not('uploaded_by', 'is', null).eq('is_active', true).order('created_at', { ascending: false });
  if (error) {
    const { data: simple } = await supabase.from('content_library').select('*').not('uploaded_by', 'is', null).eq('is_active', true).order('created_at', { ascending: false });
    return Response.json(simple ?? []);
  }
  return Response.json(data ?? []);
}

/** GET /content-library?category= &type= or grouped */
export async function findAll(request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  if (category || type) {
    let q = supabase.from('content_library').select('*').eq('is_active', true);
    if (category) q = q.eq('category', category);
    if (type) q = q.eq('type', type);
    const { data, error } = await q.order('display_order', { ascending: true }).order('name', { ascending: true });
    if (error) return Response.json({ message: error.message }, { status: 500 });
    return Response.json(data ?? []);
  }
  const { data, error } = await supabase.from('content_library').select('*').eq('is_active', true).order('category').order('display_order', { ascending: true }).order('name', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  const grouped: Record<string, unknown[]> = {};
  for (const row of data ?? []) {
    const cat = (row as { category: string }).category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(row);
  }
  return Response.json(grouped);
}

/** POST /content-library */
export async function create(request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (!(body.name && String(body.name).trim())) return Response.json({ message: 'İçerik adı boş olamaz.' }, { status: 400 });
  body.uploaded_by = user.userId;
  body.is_active = body.is_active ?? true;
  const { data, error } = await supabase.from('content_library').insert(body).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** PATCH /content-library/:id */
export async function update(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: row } = await supabase.from('content_library').select('uploaded_by').eq('id', id).single();
  if (!row) return Response.json({ message: 'Not found' }, { status: 404 });
  if (user.role !== 'super_admin' && user.role !== 'admin' && (row as { uploaded_by: string | null }).uploaded_by !== user.userId)
    return Response.json({ message: 'Access denied' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { data, error } = await supabase.from('content_library').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** DELETE /content-library/:id */
export async function remove(id: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: row } = await supabase.from('content_library').select('uploaded_by').eq('id', id).single();
  if (!row) return Response.json({ message: 'Not found' }, { status: 404 });
  if (user.role !== 'super_admin' && user.role !== 'admin' && (row as { uploaded_by: string | null }).uploaded_by !== user.userId)
    return Response.json({ message: 'Access denied' }, { status: 403 });
  const { error } = await supabase.from('content_library').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ success: true });
}
