import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, insertLocal, updateLocal, mirrorToSupabase, queryOne } from '@/lib/api-backend/db-local';

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
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  if (user.role === 'business_user') {
    if (useLocalDb()) {
      const u = await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
      if (!u || u.business_id !== id) return Response.json({ message: 'Access denied' }, { status: 403 });
    } else {
      const supabase = getServerSupabase();
      const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
      if (!u || (u as { business_id: string | null }).business_id !== id) {
        return Response.json({ message: 'Access denied' }, { status: 403 });
      }
    }
    const allowed = ['qr_background_image_url', 'qr_background_color'];
    body = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
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
  const adminPerms = body.admin_permissions as Record<string, Record<string, boolean>> | undefined;
  const bodyWithoutPerms = { ...body };
  delete bodyWithoutPerms.admin_permissions;

  const applyAdminPermissions = async (supabaseOrLocal: 'supabase' | 'local') => {
    if (!adminPerms || typeof adminPerms !== 'object') return;
    const { queryOne } = await import('@/lib/api-backend/db-local');
    const targetUser = supabaseOrLocal === 'supabase'
      ? (await getServerSupabase().from('users').select('role').eq('id', id).maybeSingle()).data
      : await queryOne<{ role: string }>('SELECT role FROM users WHERE id = $1', [id]);
    if (targetUser?.role !== 'admin') return;

    const pageKeys = Object.keys(adminPerms);
    if (supabaseOrLocal === 'supabase') {
      const supabase = getServerSupabase();
      await supabase.from('admin_permissions').delete().eq('user_id', id);
      const rows: { user_id: string; page_key: string; permission: string; actions: Record<string, boolean> }[] = [];
      for (const pageKey of pageKeys) {
        const p = adminPerms[pageKey];
        if (!p || typeof p !== 'object') continue;
        const view = !!p.view;
        const { view: _v, ...actions } = p;
        if (!view) continue;
        rows.push({ user_id: id, page_key: pageKey, permission: 'view', actions: actions || {} });
      }
      if (rows.length > 0) {
        await supabase.from('admin_permissions').insert(rows);
      }
    } else {
      const { useLocalDb: uld, getLocalPg } = await import('@/lib/api-backend/db-local');
      if (!uld()) return;
      const client = await getLocalPg();
      await client.query('DELETE FROM admin_permissions WHERE user_id = $1', [id]);
      for (const pageKey of pageKeys) {
        const p = adminPerms[pageKey];
        if (!p || typeof p !== 'object') continue;
        const view = !!p.view;
        const { view: _v, ...actions } = p;
        if (!view) continue;
        await client.query(
          `INSERT INTO admin_permissions (user_id, page_key, permission, actions) VALUES ($1, $2, 'view', $3::jsonb)
           ON CONFLICT (user_id, page_key) DO UPDATE SET permission = 'view', actions = $3::jsonb, updated_at = NOW()`,
          [id, pageKey, JSON.stringify(actions || {})]
        );
      }
    }
  };

  if (useLocalDb()) {
    const data = await updateLocal('users', id, bodyWithoutPerms);
    if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
    await applyAdminPermissions('local');
    await mirrorToSupabase('users', 'update', { id, row: { ...bodyWithoutPerms, id } });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  if (Object.keys(bodyWithoutPerms).length > 0) {
    const { data, error } = await supabase.from('users').update(bodyWithoutPerms).eq('id', id).select().single();
    if (error) return Response.json({ message: error.message }, { status: 500 });
  }
  await applyAdminPermissions('supabase');
  const { data: updated } = await supabase.from('users').select('*').eq('id', id).single();
  return Response.json(updated ?? { message: 'Not found' }, { status: updated ? 200 : 404 });
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
