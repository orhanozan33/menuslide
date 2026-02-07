import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, queryLocal, queryOne } from '@/lib/api-backend/db-local';

const TABLES_SCOPED_BY_BUSINESS = new Set(['menus', 'screens', 'templates', 'subscriptions']);
const TABLES_SCOPED_BY_USER = new Set(['content-library']);

/** Resolve business_id for list scope (menus/screens/templates) */
async function getListBusinessId(
  supabase: ReturnType<typeof getServerSupabase>,
  user: JwtPayload,
  actualTable: string,
  searchParams: URLSearchParams
): Promise<string | null> {
  const userIdParam = searchParams.get('user_id') || searchParams.get('userId');
  if ((user.role === 'super_admin' || user.role === 'admin') && userIdParam && String(userIdParam).trim()) {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', String(userIdParam).trim()).maybeSingle();
    return u?.business_id ?? null;
  }
  if (user.role === 'business_user' && user.userId) {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    return u?.business_id ?? null;
  }
  if (user.role === 'super_admin') return null;
  const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
  return u?.business_id ?? null;
}

/** GET /resource or GET /resource/:id - Supabase list/single with optional scope */
export async function handleGet(
  pathSegments: string[],
  user: JwtPayload,
  searchParams: URLSearchParams
): Promise<Response> {
  const [table, id, sub] = pathSegments;
  if (!table) return Response.json({ message: 'Not found' }, { status: 404 });

  const tableMap: Record<string, string> = {
    users: 'users',
    businesses: 'businesses',
    plans: 'plans',
    menus: 'menus',
    screens: 'screens',
    templates: 'templates',
    subscriptions: 'subscriptions',
    'content-library': 'content_library',
  };
  const actualTable = tableMap[table];
  if (!actualTable) return Response.json({ message: 'Not found' }, { status: 404 });

  if (useLocalDb()) {
    if (id && id.length === 36 && id.match(/^[0-9a-f-]{36}$/i)) {
      if (user.role === 'business_user' && actualTable === 'businesses') {
        const u = await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
        if (!u || u.business_id !== id) return Response.json({ message: 'Access denied' }, { status: 403 });
      }
      let data = await queryOne(`SELECT * FROM ${actualTable} WHERE id = $1`, [id]);
      if (data && actualTable === 'users' && (data as { role?: string }).role === 'admin') {
        const perms = await queryLocal<{ page_key: string; permission: string; actions?: Record<string, boolean> | null }>(
          'SELECT page_key, permission, actions FROM admin_permissions WHERE user_id = $1',
          [id]
        );
        const admin_permissions: Record<string, Record<string, boolean>> = {};
        perms.forEach((r) => {
          const actions = r.actions && typeof r.actions === 'object' ? r.actions : {};
          admin_permissions[r.page_key] = { view: r.permission !== 'none', ...actions };
        });
        data = { ...data, admin_permissions };
      }
      return Response.json(data ?? { message: 'Not found' }, { status: data ? 200 : 404 });
    }
    let sql = `SELECT * FROM ${actualTable}`;
    const params: unknown[] = [];
    if (user.role === 'business_user' && user.userId && TABLES_SCOPED_BY_BUSINESS.has(actualTable)) {
      const u = await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
      if (u?.business_id) {
        params.push(u.business_id);
        sql += ` WHERE business_id = $1`;
      }
    }
    if (user.role === 'business_user' && actualTable === 'content_library') {
      sql += (params.length ? ' AND' : ' WHERE') + ` (uploaded_by = $${params.length + 1} OR uploaded_by IS NULL)`;
      params.push(user.userId);
    }
    if (user.role === 'business_user' && actualTable === 'businesses' && !id) {
      const u = await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [user.userId]);
      if (u?.business_id) {
        sql = `SELECT * FROM businesses WHERE id = $1`;
        params.length = 0;
        params.push(u.business_id);
      } else {
        sql = `SELECT * FROM businesses WHERE 1=0`;
        params.length = 0;
      }
    }
    const userIdParam = searchParams.get('user_id');
    if (userIdParam && (actualTable === 'templates' || actualTable === 'screens' || actualTable === 'menus')) {
      const u = await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [userIdParam]);
      if (u?.business_id) {
        if (params.length) sql += ' AND';
        else sql += ' WHERE';
        sql += ` business_id = $${params.length + 1}`;
        params.push(u.business_id);
      }
    }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    const list = await queryLocal(sql, params);
    if (actualTable === 'menus') {
      const businessId = user.role === 'business_user' ? (await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [user.userId]))?.business_id : null;
      return Response.json({ menus: list, business_id: businessId ?? null });
    }
    if (actualTable === 'screens') {
      const businessId = user.role === 'business_user'
        ? (await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [user.userId]))?.business_id
        : (userIdParam ? (await queryOne<{ business_id: string | null }>('SELECT business_id FROM users WHERE id = $1', [searchParams.get('user_id')]))?.business_id : null);
      const subActive = businessId ? (await queryOne('SELECT id FROM subscriptions WHERE business_id = $1 AND status = $2 LIMIT 1', [businessId, 'active'])) != null : true;
      // Paketi olmayan işletme: ekran listesini boş döndür (ekranlar DB'de kalır ama kullanıcı göremez)
      const screens = subActive ? (list as { id: string }[]).map((s) => ({ ...s, active_viewer_count: 0 })) : [];
      return Response.json({ screens, subscription_active: subActive });
    }
    if (actualTable === 'users') {
      const users = list as { id: string; business_id: string | null }[];
      const enriched = await Promise.all(
        users.map(async (u) => {
          let business_name: string | null = null;
          let business_is_active: boolean | undefined;
          let plan_name: string | null = null;
          let plan_max_screens: number | null = null;
          let subscription_status: string | null = null;
          if (u.business_id) {
            const biz = await queryOne<{ name: string; is_active: boolean }>('SELECT name, is_active FROM businesses WHERE id = $1', [u.business_id]);
            if (biz) {
              business_name = biz.name;
              business_is_active = biz.is_active;
            }
            const sub = await queryOne<{ plan_id: string }>('SELECT plan_id FROM subscriptions WHERE business_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1', [u.business_id, 'active']);
            if (sub?.plan_id) {
              const plan = await queryOne<{ display_name: string; max_screens: number }>('SELECT display_name, max_screens FROM plans WHERE id = $1', [sub.plan_id]);
              if (plan) {
                plan_name = plan.display_name;
                plan_max_screens = plan.max_screens;
                subscription_status = 'active';
              }
            } else if (biz && !business_is_active) subscription_status = 'inactive';
          }
          return { ...u, business_name, business_is_active, plan_name, plan_max_screens, subscription_status };
        })
      );
      return Response.json(enriched);
    }
    return Response.json(list);
  }

  const supabase = getServerSupabase();
  let query = supabase.from(actualTable).select('*');

  if (user.role === 'business_user' && user.userId && TABLES_SCOPED_BY_BUSINESS.has(actualTable)) {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    const businessId = u?.business_id;
    if (businessId) query = query.eq('business_id', businessId);
  }
  if (user.role === 'business_user' && user.userId && actualTable === 'content_library') {
    query = query.or(`uploaded_by.eq.${user.userId},uploaded_by.is.null`);
  }
  if (user.role === 'business_user' && user.userId && actualTable === 'businesses' && !id) {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    const bizId = (u as { business_id?: string } | null)?.business_id;
    if (bizId) query = query.eq('id', bizId);
    else query = query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (id && id.length === 36 && id.match(/^[0-9a-f-]{36}$/i)) {
    if (user.role === 'business_user' && actualTable === 'businesses') {
      const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
      if ((u as { business_id?: string } | null)?.business_id !== id) {
        return Response.json({ message: 'Access denied' }, { status: 403 });
      }
    }
    const { data, error } = await query.eq('id', id).maybeSingle();
    if (error) return Response.json({ message: error.message }, { status: 500 });
    let result = data ?? null;
    if (result && actualTable === 'users' && (result as { role?: string }).role === 'admin') {
      const { data: perms } = await supabase.from('admin_permissions').select('page_key, permission, actions').eq('user_id', id);
      const admin_permissions: Record<string, Record<string, boolean>> = {};
      (perms || []).forEach((r: { page_key: string; permission: string; actions?: Record<string, boolean> | null }) => {
        const actions = r.actions && typeof r.actions === 'object' ? r.actions : {};
        admin_permissions[r.page_key] = { view: r.permission !== 'none', ...actions };
      });
      result = { ...result, admin_permissions };
    }
    return Response.json(result ?? { message: 'Not found' }, { status: result ? 200 : 404 });
  }

  const userIdParam = searchParams.get('user_id');
  if (userIdParam && (actualTable === 'templates' || actualTable === 'screens' || actualTable === 'menus')) {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', userIdParam).maybeSingle();
    if (u?.business_id) query = query.eq('business_id', u.business_id);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  const list = data ?? [];

  if (actualTable === 'menus') {
    const businessId = await getListBusinessId(supabase, user, actualTable, searchParams);
    return Response.json({ menus: list, business_id: businessId });
  }
  if (actualTable === 'screens') {
    const businessId = await getListBusinessId(supabase, user, actualTable, searchParams);
    const subActive = businessId
      ? (await supabase.from('subscriptions').select('id').eq('business_id', businessId).eq('status', 'active').limit(1).maybeSingle()).data != null
      : true;
    // Paketi olmayan işletme: ekran listesini boş döndür
    const screensRaw = subActive ? (list as { id: string }[]) : [];
    const screenIds = screensRaw.map((s) => s.id);
    let viewerCounts: Record<string, number> = {};
    if (screenIds.length > 0) {
      const stale = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: viewers } = await supabase.from('display_viewers').select('screen_id').gt('last_seen_at', stale);
      const byScreen: Record<string, number> = {};
      for (const v of viewers ?? []) {
        const sid = (v as { screen_id: string }).screen_id;
        byScreen[sid] = (byScreen[sid] ?? 0) + 1;
      }
      viewerCounts = byScreen;
    }
    const screens = screensRaw.map((s) => ({ ...s, active_viewer_count: viewerCounts[s.id] ?? 0 }));
    return Response.json({ screens, subscription_active: subActive });
  }

  // Users list: zenginleştir (business_name, plan_name, plan_max_screens, subscription_status)
  if (actualTable === 'users') {
    const users = list as { id: string; business_id: string | null; [k: string]: unknown }[];
    const businessIds = [...new Set(users.map((u) => u.business_id).filter(Boolean))] as string[];
    let bizMap: Record<string, { name: string; is_active: boolean }> = {};
    let subPlanMap: Record<string, { plan_name: string; plan_max_screens: number }> = {};
    if (businessIds.length > 0) {
      const { data: bizList } = await supabase.from('businesses').select('id, name, is_active').in('id', businessIds);
      bizMap = Object.fromEntries((bizList ?? []).map((b: { id: string; name: string; is_active: boolean }) => [b.id, { name: b.name, is_active: b.is_active }]));
      const { data: subs } = await supabase.from('subscriptions').select('business_id, plan_id, status').in('business_id', businessIds).order('created_at', { ascending: false });
      const planIds = [...new Set((subs ?? []).map((s: { plan_id: string }) => s.plan_id).filter(Boolean))];
      let planMap: Record<string, { display_name: string; max_screens: number }> = {};
      if (planIds.length > 0) {
        const { data: planList } = await supabase.from('plans').select('id, display_name, max_screens').in('id', planIds);
        planMap = Object.fromEntries((planList ?? []).map((p: { id: string; display_name: string; max_screens: number }) => [p.id, { display_name: p.display_name, max_screens: p.max_screens }]));
      }
      for (const s of (subs ?? []) as { business_id: string; plan_id: string; status: string }[]) {
        if (s.status === 'active' && !subPlanMap[s.business_id]) {
          const plan = planMap[s.plan_id];
          subPlanMap[s.business_id] = { plan_name: plan?.display_name ?? '', plan_max_screens: plan?.max_screens ?? 0 };
        }
      }
    }
    const enriched = users.map((u) => {
      const biz = u.business_id ? bizMap[u.business_id] : null;
      const subPlan = u.business_id ? subPlanMap[u.business_id] : null;
      return {
        ...u,
        business_name: biz?.name ?? null,
        business_is_active: biz?.is_active ?? undefined,
        subscription_status: subPlan ? 'active' : (biz && !biz.is_active ? 'inactive' : null),
        plan_name: subPlan?.plan_name ?? null,
        plan_max_screens: subPlan?.plan_max_screens ?? null,
      };
    });
    return Response.json(enriched);
  }

  return Response.json(list);
}

/** GET /plans - Public: sadece aktif planları döndür (1 ekran planı hariç). Token gerekmez. Fiyatlar CAD. */
export async function getPlansPublic(): Promise<Response> {
  try {
    if (useLocalDb()) {
      const list = await queryLocal(
        'SELECT * FROM plans WHERE is_active = true AND max_screens != 1 ORDER BY price_monthly ASC'
      );
      return Response.json(list);
    }
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .neq('max_screens', 1)
      .order('price_monthly', { ascending: true });
    if (error) return Response.json({ message: error.message }, { status: 500 });
    return Response.json(data ?? []);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ message: msg }, { status: 500 });
  }
}
