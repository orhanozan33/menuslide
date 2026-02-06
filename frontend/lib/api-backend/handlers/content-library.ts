import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, queryLocal, queryOne, insertLocal, updateLocal, deleteLocal, mirrorToSupabase } from '@/lib/api-backend/db-local';

/** GET /content-library/categories */
export async function getCategories(): Promise<Response> {
  if (useLocalDb()) {
    const data = await queryLocal('SELECT * FROM content_library_categories ORDER BY display_order', []);
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('content_library_categories').select('*').order('display_order', { ascending: true });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /content-library/my-uploads */
export async function getMyUploads(user: JwtPayload): Promise<Response> {
  if (useLocalDb()) {
    const data = await queryLocal('SELECT * FROM content_library WHERE uploaded_by = $1 AND is_active = true ORDER BY created_at DESC', [user.userId]);
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('content_library').select('*').eq('uploaded_by', user.userId).eq('is_active', true).order('created_at', { ascending: false });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** GET /content-library/user-uploads - admin */
export async function getUserUploads(user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  if (useLocalDb()) {
    const data = await queryLocal('SELECT * FROM content_library WHERE uploaded_by IS NOT NULL AND is_active = true ORDER BY created_at DESC', []);
    return Response.json(data);
  }
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
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  if (useLocalDb()) {
    let data: Record<string, unknown>[];
    if (category || type) {
      let sql = 'SELECT * FROM content_library WHERE is_active = true';
      const params: string[] = [];
      if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
      if (type) { params.push(type); sql += ` AND type = $${params.length}`; }
      sql += ' ORDER BY display_order, name';
      data = await queryLocal(sql, params);
    } else {
      data = await queryLocal('SELECT * FROM content_library WHERE is_active = true ORDER BY category, display_order, name', []);
    }
    if (category || type) return Response.json(data);
    const grouped: Record<string, unknown[]> = {};
    for (const row of data) {
      const cat = (row.category as string) || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(row);
    }
    return Response.json(grouped);
  }
  const supabase = getServerSupabase();
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
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (!(body.name && String(body.name).trim())) return Response.json({ message: 'İçerik adı boş olamaz.' }, { status: 400 });
  body.uploaded_by = user.userId;
  body.is_active = body.is_active ?? true;
  if (useLocalDb()) {
    const data = await insertLocal('content_library', body);
    await mirrorToSupabase('content_library', 'insert', { row: data });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('content_library').insert(body).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** PATCH /content-library/:id */
export async function update(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (useLocalDb()) {
    const row = await queryOne<{ uploaded_by: string | null }>('SELECT uploaded_by FROM content_library WHERE id = $1', [id]);
    if (!row) return Response.json({ message: 'Not found' }, { status: 404 });
    if (user.role !== 'super_admin' && user.role !== 'admin' && row.uploaded_by !== user.userId)
      return Response.json({ message: 'Access denied' }, { status: 403 });
    const data = await updateLocal('content_library', id, body);
    if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
    await mirrorToSupabase('content_library', 'update', { id, row: { ...body, id } });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data: row } = await supabase.from('content_library').select('uploaded_by').eq('id', id).single();
  if (!row) return Response.json({ message: 'Not found' }, { status: 404 });
  if (user.role !== 'super_admin' && user.role !== 'admin' && (row as { uploaded_by: string | null }).uploaded_by !== user.userId)
    return Response.json({ message: 'Access denied' }, { status: 403 });
  const { data, error } = await supabase.from('content_library').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** DELETE /content-library/:id */
export async function remove(id: string, user: JwtPayload): Promise<Response> {
  if (useLocalDb()) {
    const row = await queryOne<{ uploaded_by: string | null }>('SELECT uploaded_by FROM content_library WHERE id = $1', [id]);
    if (!row) return Response.json({ message: 'Not found' }, { status: 404 });
    if (user.role !== 'super_admin' && user.role !== 'admin' && row.uploaded_by !== user.userId)
      return Response.json({ message: 'Access denied' }, { status: 403 });
    await deleteLocal('content_library', id);
    await mirrorToSupabase('content_library', 'delete', { id });
    return Response.json({ success: true });
  }
  const supabase = getServerSupabase();
  const { data: row } = await supabase.from('content_library').select('uploaded_by').eq('id', id).single();
  if (!row) return Response.json({ message: 'Not found' }, { status: 404 });
  if (user.role !== 'super_admin' && user.role !== 'admin' && (row as { uploaded_by: string | null }).uploaded_by !== user.userId)
    return Response.json({ message: 'Access denied' }, { status: 403 });
  const { error } = await supabase.from('content_library').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ success: true });
}
