import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, insertLocal, updateLocal, mirrorToSupabase } from '@/lib/api-backend/db-local';

/** POST /businesses */
export async function createBusiness(request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (useLocalDb()) {
    const data = await insertLocal('businesses', body);
    await mirrorToSupabase('businesses', 'insert', { row: data });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('businesses').insert(body).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** PATCH /businesses/:id */
export async function updateBusiness(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role === 'business_user') return Response.json({ message: 'Access denied' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (useLocalDb()) {
    const data = await updateLocal('businesses', id, body);
    if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
    await mirrorToSupabase('businesses', 'update', { id, row: { ...body, id } });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('businesses').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** POST /users */
export async function createUser(request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (useLocalDb()) {
    const data = await insertLocal('users', body);
    await mirrorToSupabase('users', 'insert', { row: data });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('users').insert(body).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** PATCH /users/:id */
export async function updateUser(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role === 'business_user' && user.userId !== id) return Response.json({ message: 'Access denied' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (useLocalDb()) {
    const data = await updateLocal('users', id, body);
    if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
    await mirrorToSupabase('users', 'update', { id, row: { ...body, id } });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('users').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** POST /plans */
export async function createPlan(request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (useLocalDb()) {
    const data = await insertLocal('plans', body);
    await mirrorToSupabase('plans', 'insert', { row: data });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('plans').insert(body).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** PATCH /plans/:id */
export async function updatePlan(id: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (useLocalDb()) {
    const data = await updateLocal('plans', id, body);
    if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
    await mirrorToSupabase('plans', 'update', { id, row: { ...body, id } });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('plans').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}
