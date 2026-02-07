import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, insertLocal, updateLocal, deleteLocal, mirrorToSupabase, queryOne, runLocal, getLocalPg, isSupabaseConfigured } from '@/lib/api-backend/db-local';
import { insertAdminActivityLog } from '@/lib/api-backend/admin-activity-log';

/** Admin paket atadığında otomatik fatura oluştur */
async function createPaymentForSubscription(subscriptionId: string, planId: string, periodMonths: number = 1): Promise<void> {
  let priceMonthly = 0;
  if (useLocalDb()) {
    const planRow = await queryOne<{ price_monthly: number }>('SELECT price_monthly FROM plans WHERE id = $1', [planId]);
    priceMonthly = planRow?.price_monthly ?? 0;
  } else {
    const { data } = await getServerSupabase().from('plans').select('price_monthly').eq('id', planId).single();
    priceMonthly = (data as { price_monthly?: number })?.price_monthly ?? 0;
  }
  const amount = priceMonthly * periodMonths;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
  const paymentRow = {
    subscription_id: subscriptionId,
    stripe_payment_intent_id: `admin-${subscriptionId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    amount,
    currency: 'cad',
    status: 'succeeded',
    payment_date: new Date().toISOString(),
    invoice_number: invoiceNumber,
  };
  if (useLocalDb()) {
    const inserted = await insertLocal('payments', paymentRow);
    if (isSupabaseConfigured()) await mirrorToSupabase('payments', 'insert', { row: inserted });
  } else {
    await getServerSupabase().from('payments').insert(paymentRow);
  }
}

/** Create screens for business up to maxScreens (used when plan assigned by admin) */
async function createScreensForBusiness(businessId: string, maxScreens: number): Promise<void> {
  if (maxScreens < 1 || maxScreens === -1) return;
  if (useLocalDb()) {
    const client = await getLocalPg();
    const { rows: countRows } = await client.query('SELECT COUNT(*)::int as cnt FROM screens WHERE business_id = $1', [businessId]);
    const currentCount = countRows[0]?.cnt ?? 0;
    const toCreate = maxScreens - currentCount;
    if (toCreate <= 0) return;
    const { rows: bizRows } = await client.query('SELECT name FROM businesses WHERE id = $1', [businessId]);
    const businessName = bizRows[0]?.name || 'business';
    for (let i = 0; i < toCreate; i++) {
      const name = `TV${currentCount + i + 1}`;
      const publicToken = randomBytes(32).toString('hex');
      const publicSlug = `${businessName}-${name}-${Date.now().toString(36)}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      await client.query(
        `INSERT INTO screens (business_id, name, public_token, public_slug, is_active, animation_type, animation_duration)
         VALUES ($1, $2, $3, $4, true, 'fade', 500)`,
        [businessId, name, publicToken, publicSlug]
      );
    }
  } else {
    const supabase = getServerSupabase();
    const { count } = await supabase.from('screens').select('*', { count: 'exact', head: true }).eq('business_id', businessId);
    const currentCount = count ?? 0;
    const toCreate = maxScreens - currentCount;
    if (toCreate <= 0) return;
    const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
    const businessName = (biz as { name?: string })?.name || 'business';
    for (let i = 0; i < toCreate; i++) {
      const name = `TV${currentCount + i + 1}`;
      const publicToken = randomBytes(32).toString('hex');
      const publicSlug = `${businessName}-${name}-${Date.now().toString(36)}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      await supabase.from('screens').insert({ business_id: businessId, name, public_token: publicToken, public_slug: publicSlug, is_active: true, animation_type: 'fade', animation_duration: 500 });
    }
  }
}

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
    await insertAdminActivityLog(user, { action_type: 'business_create', page_key: 'users', resource_type: 'business', resource_id: (data as { id: string }).id, details: { name: String(body.name || '') } });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('businesses').insert(body).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  await insertAdminActivityLog(user, { action_type: 'business_create', page_key: 'users', resource_type: 'business', resource_id: (data as { id: string }).id, details: { name: String(body.name || '') } });
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
    if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'business_update', page_key: 'users', resource_type: 'business', resource_id: id, details: {} });
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('businesses').update(body).eq('id', id).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'business_update', page_key: 'users', resource_type: 'business', resource_id: id, details: {} });
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
  const planId = body.plan_id as string | undefined;
  const bodyWithoutPlan = { ...body };
  delete bodyWithoutPlan.plan_id;

  if (useLocalDb()) {
    const data = await insertLocal('users', bodyWithoutPlan);
    await mirrorToSupabase('users', 'insert', { row: data });
    await insertAdminActivityLog(user, { action_type: 'user_create', page_key: 'users', resource_type: 'user', resource_id: (data as { id: string }).id, details: { email: String(body.email || '') } });
    if (planId && data.business_id) {
      const businessId = data.business_id as string;
      const client = await getLocalPg();
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const nowStr = now.toISOString();
      const endStr = periodEnd.toISOString();
      const { rows } = await client.query(
        'INSERT INTO subscriptions (business_id, plan_id, status, current_period_start, current_period_end) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [businessId, planId, 'active', nowStr, endStr]
      );
      const subRow = rows[0];
      const subId = subRow?.id;
      if (isSupabaseConfigured() && subRow) await mirrorToSupabase('subscriptions', 'insert', { row: subRow });
      if (subId) await createPaymentForSubscription(subId, planId, 1);
      const planRow = await queryOne<{ max_screens: number }>('SELECT max_screens FROM plans WHERE id = $1', [planId]);
      const maxScreens = planRow?.max_screens ?? 0;
      if (maxScreens > 0 && maxScreens !== -1) await createScreensForBusiness(businessId, maxScreens);
    }
    return Response.json(data);
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('users').insert(bodyWithoutPlan).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (planId && data?.business_id) {
    const businessId = data.business_id as string;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const nowStr = now.toISOString();
    const endStr = periodEnd.toISOString();
    const { data: subData } = await supabase.from('subscriptions').insert({ business_id: businessId, plan_id: planId, status: 'active', current_period_start: nowStr, current_period_end: endStr }).select('id').single();
    const subId = (subData as { id?: string })?.id;
    if (subId) await createPaymentForSubscription(subId, planId, 1);
    const { data: planData } = await supabase.from('plans').select('max_screens').eq('id', planId).maybeSingle();
    const maxScreens = (planData as { max_screens?: number })?.max_screens ?? 0;
    if (maxScreens > 0 && maxScreens !== -1) await createScreensForBusiness(businessId, maxScreens);
  }
  await insertAdminActivityLog(user, { action_type: 'user_create', page_key: 'users', resource_type: 'user', resource_id: (data as { id: string }).id, details: { email: String(body.email || '') } });
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
  const stopReason = typeof body.stop_reason === 'string' && body.stop_reason ? body.stop_reason : null;
  const subscriptionPeriodMonths = (typeof body.subscription_period_months === 'number' && body.subscription_period_months >= 1)
    ? Math.min(body.subscription_period_months, 120) // max 10 yıl
    : 1;
  const isActive = body.is_active as boolean | undefined;
  const businessName = body.business_name as string | undefined;
  const bodyWithoutPerms = { ...body };
  delete bodyWithoutPerms.admin_permissions;
  delete bodyWithoutPerms.plan_id;
  delete bodyWithoutPerms.subscription_period_months;
  delete bodyWithoutPerms.stop_reason;
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
        const planRow = await queryOne<{ max_screens: number }>('SELECT max_screens FROM plans WHERE id = $1', [planId]);
        const maxScreens = planRow?.max_screens ?? 0;
        const newStatus = maxScreens === 0 ? 'canceled' : 'active';
        const { rows } = await client.query('SELECT id FROM subscriptions WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1', [businessId]);
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + subscriptionPeriodMonths);
        const nowStr = now.toISOString();
        const endStr = periodEnd.toISOString();
        let subId: string;
        let subRow: Record<string, unknown> | null = null;
        if (rows.length > 0) {
          subId = rows[0].id;
          if (maxScreens === 0 && stopReason) {
            await client.query(
              'UPDATE subscriptions SET plan_id = $1, status = $2, current_period_start = $3, current_period_end = $4, stop_reason = $5, stopped_at = NOW(), updated_at = NOW() WHERE id = $6',
              [planId, newStatus, nowStr, endStr, stopReason, subId]
            );
          } else {
            await client.query(
              'UPDATE subscriptions SET plan_id = $1, status = $2, current_period_start = $3, current_period_end = $4, stop_reason = NULL, stopped_at = NULL, updated_at = NOW() WHERE id = $5',
              [planId, newStatus, nowStr, endStr, subId]
            );
          }
          subRow = await queryOne('SELECT * FROM subscriptions WHERE id = $1', [subId]) as Record<string, unknown>;
        } else {
          const stopReasonVal = maxScreens === 0 && stopReason ? stopReason : null;
          const { rows: insRows } = await client.query(
            'INSERT INTO subscriptions (business_id, plan_id, status, current_period_start, current_period_end, stop_reason, stopped_at) VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 IS NOT NULL THEN NOW() ELSE NULL END) RETURNING *',
            [businessId, planId, newStatus, nowStr, endStr, stopReasonVal]
          );
          subRow = insRows[0] as Record<string, unknown>;
          subId = subRow?.id as string;
        }
        if (subId && newStatus === 'active') await createPaymentForSubscription(subId, planId, subscriptionPeriodMonths);
        if (isSupabaseConfigured() && subRow) {
          if (rows.length > 0) {
            await mirrorToSupabase('subscriptions', 'update', { id: subId, row: subRow });
          } else {
            await mirrorToSupabase('subscriptions', 'insert', { row: subRow });
          }
        }
        if (maxScreens === 0) {
          await stopAllScreensForBusiness(businessId);
        } else {
          await reactivateScreensForBusiness(businessId);
          if (maxScreens !== -1) await createScreensForBusiness(businessId, maxScreens);
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
        const { data: planData } = await supabase.from('plans').select('max_screens').eq('id', planId).maybeSingle();
        const maxScreens = (planData as { max_screens?: number })?.max_screens ?? 0;
        const newStatus = maxScreens === 0 ? 'canceled' : 'active';
        const { data: existing } = await supabase.from('subscriptions').select('id').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + subscriptionPeriodMonths);
        const nowStr = now.toISOString();
        const endStr = periodEnd.toISOString();
        let subId: string | undefined;
        const stopPayload = maxScreens === 0 && stopReason ? { stop_reason: stopReason, stopped_at: new Date().toISOString() } : { stop_reason: null, stopped_at: null };
        if (existing) {
          subId = existing.id;
          const { error: updErr } = await supabase.from('subscriptions').update({ plan_id: planId, status: newStatus, current_period_start: nowStr, current_period_end: endStr, ...stopPayload }).eq('id', subId);
          if (updErr) {
            console.error('[updateUser] subscription update failed:', updErr);
            throw new Error(`Paket güncellenemedi: ${updErr.message}`);
          }
        } else {
          const insertRow: Record<string, unknown> = { business_id: businessId, plan_id: planId, status: newStatus, current_period_start: nowStr, current_period_end: endStr };
          if (maxScreens === 0 && stopReason) {
            insertRow.stop_reason = stopReason;
            insertRow.stopped_at = new Date().toISOString();
          }
          const { data: ins } = await supabase.from('subscriptions').insert(insertRow).select('id').single();
          subId = (ins as { id?: string })?.id;
        }
        if (subId && newStatus === 'active') await createPaymentForSubscription(subId, planId, subscriptionPeriodMonths);
        if (maxScreens === 0) {
          await stopAllScreensForBusiness(businessId);
        } else {
          await reactivateScreensForBusiness(businessId);
          if (maxScreens > 0 && maxScreens !== -1) await createScreensForBusiness(businessId, maxScreens);
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
    if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'user_update', page_key: 'users', resource_type: 'user', resource_id: id, details: {} });
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
  if (user.role === 'admin' || user.role === 'super_admin') await insertAdminActivityLog(user, { action_type: 'user_update', page_key: 'users', resource_type: 'user', resource_id: id, details: {} });
  return Response.json(updated ?? { message: 'Not found' }, { status: updated ? 200 : 404 });
}

/** DELETE /users/:id */
export async function deleteUser(id: string, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return Response.json({ message: 'Admin required' }, { status: 403 });
  }
  const target = useLocalDb()
    ? await queryOne<{ role: string; business_id: string | null }>('SELECT role, business_id FROM users WHERE id = $1', [id])
    : (await getServerSupabase().from('users').select('role, business_id').eq('id', id).maybeSingle()).data as { role: string; business_id: string | null } | null;
  if (!target) return Response.json({ message: 'Not found' }, { status: 404 });
  if (target.role === 'super_admin') {
    return Response.json({ message: 'Super admin cannot be deleted' }, { status: 403 });
  }
  const businessId = target.business_id ?? null;

  if (useLocalDb()) {
    await runLocal('DELETE FROM admin_permissions WHERE user_id = $1', [id]);
    await deleteLocal('users', id);
    await mirrorToSupabase('users', 'delete', { id });
    if (businessId) {
      const other = await queryOne<{ id: string }>('SELECT id FROM users WHERE business_id = $1 AND id != $2 LIMIT 1', [businessId, id]);
      if (!other) {
        await runLocal('UPDATE businesses SET is_active = false, updated_at = NOW() WHERE id = $1', [businessId]);
        if (isSupabaseConfigured()) {
          await getServerSupabase().from('businesses').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', businessId);
        }
      }
    }
    await insertAdminActivityLog(user, { action_type: 'user_delete', page_key: 'users', resource_type: 'user', resource_id: id, details: {} });
    return Response.json({ success: true });
  }
  const supabase = getServerSupabase();
  await supabase.from('admin_permissions').delete().eq('user_id', id);
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (businessId) {
    const { data: other } = await supabase.from('users').select('id').eq('business_id', businessId).limit(1).maybeSingle();
    if (!other) {
      await supabase.from('businesses').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', businessId);
    }
  }
  await insertAdminActivityLog(user, { action_type: 'user_delete', page_key: 'users', resource_type: 'user', resource_id: id, details: {} });
  return Response.json({ success: true });
}

/** Stop all screens for business (set is_active=false, rotations inactive). Used when subscription stopped. */
async function stopAllScreensForBusiness(businessId: string): Promise<void> {
  if (useLocalDb()) {
    const client = await getLocalPg();
    await client.query('UPDATE screens SET is_active = false WHERE business_id = $1', [businessId]);
    await client.query(
      `UPDATE screen_template_rotations str SET is_active = false
       FROM screens s WHERE s.business_id = $1 AND str.screen_id = s.id`,
      [businessId]
    );
    // TV display Supabase'den veri aldığı için ekranları Supabase'de de kilitliyoruz
    if (isSupabaseConfigured()) {
      const supabase = getServerSupabase();
      const { data: screens } = await supabase.from('screens').select('id').eq('business_id', businessId);
      if (screens?.length) {
        await supabase.from('screens').update({ is_active: false }).eq('business_id', businessId);
        for (const s of screens) {
          await supabase.from('screen_template_rotations').update({ is_active: false }).eq('screen_id', s.id);
        }
      }
    }
  } else {
    const supabase = getServerSupabase();
    const { data: screens } = await supabase.from('screens').select('id').eq('business_id', businessId);
    if (screens?.length) {
      await supabase.from('screens').update({ is_active: false }).eq('business_id', businessId);
      for (const s of screens) {
        await supabase.from('screen_template_rotations').update({ is_active: false }).eq('screen_id', s.id);
      }
    }
  }
}

/** Reactivate screens and their rotations. Used when subscription renewed. */
async function reactivateScreensForBusiness(businessId: string): Promise<void> {
  if (useLocalDb()) {
    const client = await getLocalPg();
    await client.query('UPDATE screens SET is_active = true WHERE business_id = $1', [businessId]);
    const { rows } = await client.query('SELECT id FROM screens WHERE business_id = $1', [businessId]);
    for (const r of rows ?? []) {
      await client.query('UPDATE screen_template_rotations SET is_active = true WHERE screen_id = $1', [r.id]);
    }
  } else {
    const supabase = getServerSupabase();
    await supabase.from('screens').update({ is_active: true }).eq('business_id', businessId);
    const { data: screens } = await supabase.from('screens').select('id').eq('business_id', businessId);
    if (screens?.length) {
      for (const s of screens) {
        await supabase.from('screen_template_rotations').update({ is_active: true }).eq('screen_id', s.id);
      }
    }
  }
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
  const maxScreens = typeof body.max_screens === 'number' ? body.max_screens : null;
  const name = typeof body.name === 'string' ? body.name : '';
  const isZeroPlan = maxScreens === 0 || name === 'plan_0' || name === 'package-stopped';
  if (isZeroPlan) {
    if (useLocalDb()) {
      const existing = await queryOne<{ id: string; name: string }>('SELECT id, name FROM plans WHERE max_screens = 0 LIMIT 1');
      if (existing) {
        const full = await queryOne('SELECT * FROM plans WHERE id = $1', [existing.id]);
        return Response.json(full ?? existing);
      }
    } else {
      const supabase = getServerSupabase();
      const { data: existing } = await supabase.from('plans').select('*').eq('max_screens', 0).limit(1).maybeSingle();
      if (existing) return Response.json(existing);
    }
  }
  if (useLocalDb()) {
    try {
      const data = await insertLocal('plans', body);
      await mirrorToSupabase('plans', 'insert', { row: data });
      return Response.json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/duplicate|unique|plans_name_key/i.test(msg)) {
        const existing = await queryOne('SELECT * FROM plans WHERE max_screens = 0 LIMIT 1');
        if (existing) return Response.json(existing);
      }
      throw err;
    }
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('plans').insert(body).select().single();
  if (error) {
    if (/duplicate|unique|plans_name_key/i.test(error.message)) {
      const { data: existing } = await supabase.from('plans').select('*').eq('max_screens', 0).limit(1).maybeSingle();
      if (existing) return Response.json(existing);
    }
    return Response.json({ message: error.message }, { status: 500 });
  }
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
