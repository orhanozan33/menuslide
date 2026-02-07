import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, insertLocal, updateLocal, deleteLocal, mirrorToSupabase, queryOne, runLocal, getLocalPg, isSupabaseConfigured } from '@/lib/api-backend/db-local';

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
  const planId = body.plan_id as string | undefined;
  const isActive = body.is_active as boolean | undefined;
  const businessName = body.business_name as string | undefined;
  const bodyWithoutPerms = { ...body };
  delete bodyWithoutPerms.admin_permissions;
  delete bodyWithoutPerms.plan_id;
  delete bodyWithoutPerms.is_active;
  delete bodyWithoutPerms.business_name;

  const applyPlanAndBusiness = async () => {
    if (!planId && typeof isActive !== 'boolean' && businessName === undefined) return;
    const targetUser = useLocalDb()
      ? await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [id])
      : (await getServerSupabase().from('users').select('business_id').eq('id', id).maybeSingle()).data as { business_id: string | null } | null;
    const businessId = targetUser?.business_id;
    if (!businessId) return;
    if (useLocalDb()) {
      if (typeof isActive === 'boolean') {
        await runLocal('UPDATE businesses SET is_active = $1, updated_at = NOW() WHERE id = $2', [isActive, businessId]);
        if (isSupabaseConfigured()) {
          const supabase = getServerSupabase();
          await supabase.from('businesses').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', businessId);
        }
      }
      if (businessName !== undefined) {
        await runLocal('UPDATE businesses SET name = $1, updated_at = NOW() WHERE id = $2', [businessName, businessId]);
        if (isSupabaseConfigured()) {
          const supabase = getServerSupabase();
          await supabase.from('businesses').update({ name: businessName, updated_at: new Date().toISOString() }).eq('id', businessId);
        }
      }
      if (planId) {
        const client = await getLocalPg();
        const { rows } = await client.query('SELECT id FROM subscriptions WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1', [businessId]);
        const now = new Date().toISOString();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        if (rows.length > 0) {
          await client.query('UPDATE subscriptions SET plan_id = $1, current_period_end = $2, updated_at = NOW() WHERE id = $3', [planId, periodEnd.toISOString(), rows[0].id]);
        } else {
          await client.query(
            'INSERT INTO subscriptions (business_id, plan_id, status, current_period_start, current_period_end) VALUES ($1, $2, $3, $4, $5)',
            [businessId, planId, 'active', now, periodEnd.toISOString()]
          );
        }
        if (isSupabaseConfigured()) {
          const supabase = getServerSupabase();
          const { data: existing } = await supabase.from('subscriptions').select('id').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (existing) {
            await supabase.from('subscriptions').update({ plan_id: planId, current_period_end: periodEnd.toISOString() }).eq('id', existing.id);
          } else {
            await supabase.from('subscriptions').insert({ business_id: businessId, plan_id: planId, status: 'active', current_period_start: now, current_period_end: periodEnd.toISOString() });
          }
        }
      }
    } else {
      const supabase = getServerSupabase();
      if (typeof isActive === 'boolean') {
        await supabase.from('businesses').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', businessId);
      }
      if (businessName !== undefined) {
        await supabase.from('businesses').update({ name: businessName, updated_at: new Date().toISOString() }).eq('id', businessId);
      }
      if (planId) {
        const { data: existing } = await supabase.from('subscriptions').select('id').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const now = new Date().toISOString();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        if (existing) {
          await supabase.from('subscriptions').update({ plan_id: planId, current_period_end: periodEnd.toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('subscriptions').insert({ business_id: businessId, plan_id: planId, status: 'active', current_period_start: now, current_period_end: periodEnd.toISOString() });
        }
      }
    }
  };

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
    await applyPlanAndBusiness();
    await mirrorToSupabase('users', 'update', { id, row: { ...bodyWithoutPerms, id } });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  if (Object.keys(bodyWithoutPerms).length > 0) {
    const { data, error } = await supabase.from('users').update(bodyWithoutPerms).eq('id', id).select().single();
    if (error) return Response.json({ message: error.message }, { status: 500 });
  }
  await applyAdminPermissions('supabase');
  await applyPlanAndBusiness();
  const { data: updated } = await supabase.from('users').select('*').eq('id', id).single();
  return Response.json(updated ?? { message: 'Not found' }, { status: updated ? 200 : 404 });
}

/** DELETE /users/:id */
export async function deleteUser(id: string, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return Response.json({ message: 'Admin required' }, { status: 403 });
  }
  const target = useLocalDb()
    ? await queryOne<{ role: string }>('SELECT role FROM users WHERE id = $1', [id])
    : (await getServerSupabase().from('users').select('role').eq('id', id).maybeSingle()).data as { role: string } | null;
  if (!target) return Response.json({ message: 'Not found' }, { status: 404 });
  if (target.role === 'super_admin') {
    return Response.json({ message: 'Super admin cannot be deleted' }, { status: 403 });
  }
  if (useLocalDb()) {
    await runLocal('DELETE FROM admin_permissions WHERE user_id = $1', [id]);
    await deleteLocal('users', id);
    await mirrorToSupabase('users', 'delete', { id });
    return Response.json({ success: true });
  }
  const supabase = getServerSupabase();
  await supabase.from('admin_permissions').delete().eq('user_id', id);
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ success: true });
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
