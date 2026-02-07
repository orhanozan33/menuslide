import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, queryLocal, queryOne, insertLocal, mirrorToSupabase } from '@/lib/api-backend/db-local';
import { insertAdminActivityLog } from '@/lib/api-backend/admin-activity-log';

/** Supabase plans join returns object or array; extract max_screens safely. */
function getMaxScreens(plans: unknown): number {
  if (!plans) return 0;
  const p = Array.isArray(plans) ? plans[0] : plans;
  return (p as { max_screens?: number })?.max_screens ?? 0;
}

/** GET /reports/users - users with subscription status (admin). "Tüm üyeler" = işletme kullanıcıları (admin/super_admin hariç). */
export async function getUsersWithSubscription(user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return Response.json({ message: 'Admin access required' }, { status: 403 });
  }
  try {
    const supabase = getServerSupabase();
    const { data: allUsers, error } = await supabase.from('users').select('id, email, full_name, role, business_id, created_at').order('created_at', { ascending: false }).limit(500);
    if (error) return Response.json([]);
    const users = (allUsers ?? []).filter((u: { role?: string }) => u.role !== 'super_admin' && u.role !== 'admin');
    const businessIds = Array.from(new Set(users.map((u: { business_id?: string }) => u.business_id).filter(Boolean))) as string[];
    let activeSet = new Set<string>();
    const stoppedMap = new Map<string, { plan_name: string; plan_max_screens: number; stop_reason: string }>();
    let activeSubs: { business_id: string; plan_id?: string; plans?: unknown }[] = [];
    const planMap: Record<string, { display_name: string; max_screens: number }> = {};
    if (businessIds.length > 0) {
      const [
        { data: subs },
        { data: allSubs },
        { data: paidList },
      ] = await Promise.all([
        supabase.from('subscriptions').select('id, business_id, current_period_end, plan_id, plans(max_screens, display_name)').eq('status', 'active').in('business_id', businessIds),
        supabase.from('subscriptions').select('business_id, plan_id, stop_reason, plans(max_screens, display_name)').eq('status', 'canceled').in('business_id', businessIds).order('updated_at', { ascending: false }),
        supabase.from('payments').select('subscription_id').eq('status', 'succeeded'),
      ]);
      const now = new Date().toISOString();
      const paidIds = new Set(((paidList ?? []) as { subscription_id: string }[]).map((p) => p.subscription_id));
      const trulyActive = (subs ?? []).filter((s: { id: string; business_id: string; current_period_end?: string; plans?: unknown }) =>
        paidIds.has(s.id) &&
        (!s.current_period_end || s.current_period_end >= now) &&
        getMaxScreens(s.plans) > 0
      );
      activeSubs = trulyActive;
      trulyActive.forEach((s: { business_id: string; plan_id?: string; plans?: unknown }) => {
        activeSet.add(s.business_id);
        const p = (Array.isArray(s.plans) ? s.plans[0] : s.plans) as { display_name?: string; max_screens?: number };
        if (p && s.plan_id) planMap[s.plan_id] = { display_name: p.display_name ?? '', max_screens: p.max_screens ?? 0 };
      });
      (allSubs ?? []).forEach((s: { business_id: string; plan_id?: string; stop_reason?: string; plans?: unknown }) => {
        if (!stoppedMap.has(s.business_id) && s.stop_reason) {
          const p = (Array.isArray(s.plans) ? s.plans[0] : s.plans) as { display_name?: string; max_screens?: number };
          stoppedMap.set(s.business_id, {
            plan_name: p?.display_name ?? '0 ekran',
            plan_max_screens: p?.max_screens ?? 0,
            stop_reason: s.stop_reason ?? '',
          });
        }
      });
    }
    const list = users.map((u: { business_id?: string } & Record<string, unknown>) => {
      const bid = u.business_id as string | undefined;
      const hasActive = bid ? activeSet.has(bid) : false;
      const stopped = bid ? stoppedMap.get(bid) : null;
      const subscription_status: 'active' | 'stopped' | 'none' = hasActive ? 'active' : (stopped ? 'stopped' : 'none');
      let plan_name: string | null = null;
      let plan_max_screens: number | null = null;
      let stop_reason: string | null = null;
      if (hasActive) {
        const sub = activeSubs.find((s: { business_id: string }) => s.business_id === bid);
        const p = sub?.plan_id ? planMap[sub.plan_id] : null;
        plan_name = p?.display_name ?? null;
        plan_max_screens = p?.max_screens ?? null;
      } else if (stopped) {
        plan_name = stopped.plan_name;
        plan_max_screens = stopped.plan_max_screens;
        stop_reason = stopped.stop_reason || null;
      }
      return {
        ...u,
        has_active_subscription: hasActive,
        subscription_status,
        plan_name,
        plan_max_screens,
        stop_reason,
      };
    });
    return Response.json(list);
  } catch {
    return Response.json([]);
  }
}

/** GET /reports/stats - summary stats (admin) */
export async function getStats(request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return Response.json({ message: 'Admin access required' }, { status: 403 });
  }
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const revenueFrom = searchParams.get('revenueFrom');
  const revenueTo = searchParams.get('revenueTo');
  const hasDateRange = revenueFrom && revenueTo && !isNaN(new Date(revenueFrom).getTime()) && !isNaN(new Date(revenueTo).getTime());

  const now = new Date().toISOString();
  const [
    totalUsersRes,
    usersWithBizRes,
    screensActiveRes,
    screensStoppedRes,
    newUsers7dRes,
    newUsers30dRes,
    paymentsTotal,
    paymentsThisMonth,
    paymentsRange,
    activeSubsRes,
    totalSubsRes,
    paidSubIdsRes,
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business_user'),
    supabase.from('users').select('business_id').eq('role', 'business_user').not('business_id', 'is', null),
    supabase.from('screens').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('screens').select('*', { count: 'exact', head: true }).eq('is_active', false),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business_user').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business_user').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('payments').select('amount').eq('status', 'succeeded'),
    supabase.from('payments').select('amount').eq('status', 'succeeded').gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    hasDateRange ? supabase.from('payments').select('amount').eq('status', 'succeeded').gte('payment_date', revenueFrom!).lte('payment_date', revenueTo!) : Promise.resolve({ data: [] as { amount: number }[] }),
    supabase.from('subscriptions').select('id, business_id, current_period_end, plans(max_screens)').eq('status', 'active'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('subscription_id').eq('status', 'succeeded'),
  ]);
  const totalUsers = totalUsersRes.count ?? 0;
  const businessIdsFromUsers = Array.from(new Set(
    ((usersWithBizRes.data ?? []) as { business_id: string }[]).map((u) => u.business_id).filter(Boolean)
  ));
  // Sadece businesses tablosunda var olan VE is_active=true olan işletmeler sayılır (silinen/pasif işletmeler hariç)
  let totalBusinesses = 0;
  const activeBizIds = new Set<string>();
  if (businessIdsFromUsers.length > 0) {
    const { data: activeBiz } = await supabase.from('businesses').select('id').in('id', businessIdsFromUsers).eq('is_active', true);
    const ids = ((activeBiz ?? []) as { id: string }[]).map((b) => b.id);
    ids.forEach((id) => activeBizIds.add(id));
    totalBusinesses = activeBizIds.size;
  }
  const totalScreens = screensActiveRes.count ?? 0;
  const screensStopped = screensStoppedRes.count ?? 0;
  const newUsers7d = newUsers7dRes.count ?? 0;
  const newUsers30d = newUsers30dRes.count ?? 0;
  const totalSubsCount = totalSubsRes.count ?? 0;

  // Paketi olan işletmeler: active + süresi geçmemiş + max_screens>0 (ödeme zorunlu değil, admin tarafından atanmış paketler de sayılır)
  const paidSubIds = new Set(
    ((paidSubIdsRes.data ?? []) as { subscription_id: string }[]).map((p) => p.subscription_id)
  );
  const activeSubsRaw = (activeSubsRes.data ?? []) as { id: string; business_id: string; current_period_end?: string; plans?: unknown }[];
  const subsWithValidPeriod = activeSubsRaw.filter(
    (s) =>
      (!s.current_period_end || s.current_period_end >= now) &&
      getMaxScreens(s.plans) > 0
  );
  const activeBizSet = new Set(subsWithValidPeriod.map((s) => s.business_id));
  // Aktif abonelik sayısı (gelir raporu için): ödemesi olanlar
  const trulyActiveSubs = subsWithValidPeriod.filter((s) => paidSubIds.has(s.id));
  const activeSubsCount = trulyActiveSubs.length;

  const sum = (arr: { amount?: number }[] | null) => (arr ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const revenueTotal = sum(paymentsTotal.data as { amount: number }[] ?? null);
  const revenueThisMonth = sum(paymentsThisMonth.data as { amount: number }[] ?? null);
  const revenueInRange = hasDateRange ? sum(paymentsRange.data as { amount: number }[] ?? null) : null;

  const { data: usersWithBiz } = await supabase.from('users').select('id, business_id').eq('role', 'business_user');
  const usersWithSubscription = (usersWithBiz ?? []).filter((u: { business_id?: string }) => u.business_id && activeBizSet.has(u.business_id)).length;
  const usersWithoutSubscription = (usersWithBiz ?? []).length - usersWithSubscription;
  const businessesWithSubscription = Array.from(activeBizIds).filter((id) => activeBizSet.has(id)).length;
  const businessesWithoutSubscription = Math.max(0, totalBusinesses - businessesWithSubscription);

  return Response.json({
    totalUsers,
    totalBusinesses,
    totalScreens,
    screensStopped,
    newUsers7d,
    newUsers30d,
    activeSubscriptions: activeSubsCount,
    totalSubscriptions: totalSubsCount,
    usersWithSubscription,
    usersWithoutSubscription,
    businessesWithSubscription,
    businessesWithoutSubscription,
    revenue: revenueTotal,
    revenueTotal,
    revenueThisMonth,
    revenueInRange,
  });
}

/** GET /reports/payment-status - { recentPayments, failedPayments, overdueSubscriptions } (admin) */
export async function getPaymentStatus(user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return Response.json({ message: 'Admin access required' }, { status: 403 });
  }
  const supabase = getServerSupabase();
  const [paymentsRes, failuresRes, subsRes] = await Promise.all([
    supabase.from('payments').select('*').eq('status', 'succeeded').order('payment_date', { ascending: false }).limit(50),
    supabase.from('payment_failures').select('*').order('attempted_at', { ascending: false }).limit(50),
    supabase.from('subscriptions').select('*').eq('status', 'active').not('current_period_end', 'is', null),
  ]);
  const now = new Date().toISOString();
  const overdueSubscriptions = (subsRes.data ?? []).filter((s: { current_period_end?: string }) => s.current_period_end && s.current_period_end < now);

  // Ödemelere kullanıcı ve işletme bilgisi ekle
  const payments = (paymentsRes.data ?? []) as { id: string; subscription_id?: string; amount: number; currency: string; payment_date?: string; status?: string }[];
  const subIds = Array.from(new Set(payments.map((p) => p.subscription_id).filter(Boolean))) as string[];
  const businessIds = new Set<string>();
  const subToBiz = new Map<string, string>();
  if (subIds.length > 0) {
    const { data: subs } = await supabase.from('subscriptions').select('id, business_id').in('id', subIds);
    (subs ?? []).forEach((s: { id: string; business_id?: string }) => {
      if (s.business_id) {
        subToBiz.set(s.id, s.business_id);
        businessIds.add(s.business_id);
      }
    });
  }
  const bizIds = Array.from(businessIds);
  const bizNames = new Map<string, string>();
  const userEmails = new Map<string, string | null>();
  if (bizIds.length > 0) {
    const [bizRes, usersRes] = await Promise.all([
      supabase.from('businesses').select('id, name').in('id', bizIds),
      supabase.from('users').select('business_id, email').in('business_id', bizIds).eq('role', 'business_user'),
    ]);
    (bizRes.data ?? []).forEach((b: { id: string; name?: string }) => bizNames.set(b.id, b.name ?? ''));
    (usersRes.data ?? []).forEach((u: { business_id: string; email?: string }) => {
      if (!userEmails.has(u.business_id)) userEmails.set(u.business_id, u.email ?? null);
    });
  }
  const recentPayments = payments.map((p) => {
    const bid = p.subscription_id ? subToBiz.get(p.subscription_id) : undefined;
    return {
      ...p,
      business_name: bid ? (bizNames.get(bid) ?? '') : '',
      user_email: bid ? (userEmails.get(bid) ?? null) : null,
    };
  });

  // Başarısız ödemelere kullanıcı ve işletme bilgisi ekle (business_id zaten var)
  const failures = (failuresRes.data ?? []) as { id: string; business_id?: string; amount?: number; currency?: string; failure_reason?: string; attempted_at?: string }[];
  const failBizIds = Array.from(new Set(failures.map((f) => f.business_id).filter(Boolean))) as string[];
  const failBizNames = new Map<string, string>();
  const failUserEmails = new Map<string, string | null>();
  if (failBizIds.length > 0) {
    const [fbizRes, fusersRes] = await Promise.all([
      supabase.from('businesses').select('id, name').in('id', failBizIds),
      supabase.from('users').select('business_id, email').in('business_id', failBizIds).eq('role', 'business_user'),
    ]);
    (fbizRes.data ?? []).forEach((b: { id: string; name?: string }) => failBizNames.set(b.id, b.name ?? ''));
    (fusersRes.data ?? []).forEach((u: { business_id: string; email?: string }) => {
      if (!failUserEmails.has(u.business_id)) failUserEmails.set(u.business_id, u.email ?? null);
    });
  }
  const failedPayments = failures.map((f) => ({
    ...f,
    business_name: f.business_id ? (failBizNames.get(f.business_id) ?? '') : '',
    user_email: f.business_id ? (failUserEmails.get(f.business_id) ?? null) : null,
  }));

  return Response.json({
    recentPayments,
    failedPayments,
    overdueSubscriptions,
  });
}

/** GET /reports/user/:userId - user detail report (admin) */
export async function getUserDetailReport(userId: string, currentUserId: string, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  const supabase = getServerSupabase();
  const { data: u } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!u) return Response.json({ message: 'User not found' }, { status: 404 });
  const userEmail = (u as { email?: string }).email;
  let phone: string | null = null;
  let address: string | null = null;
  // Supabase'den registration_requests (öncelik: status='registered')
  try {
    let regList: { phone?: string; address?: string }[] | null = null;
    const { data: regRegistered } = await supabase.from('registration_requests').select('phone, address').eq('email', userEmail).eq('status', 'registered').order('created_at', { ascending: false }).limit(1);
    if (regRegistered?.length) regList = regRegistered;
    if (!regList?.length) {
      const { data: regAny } = await supabase.from('registration_requests').select('phone, address').eq('email', userEmail).order('created_at', { ascending: false }).limit(1);
      regList = regAny;
    }
    const reg = regList?.[0];
    if (reg) {
      phone = (reg.phone ?? '').trim() || null;
      address = (reg.address ?? '').trim() || null;
    }
  } catch {
    // ignore if registration_requests not available
  }
  // Yerel DB kullanılıyorsa ve Supabase'de bulunamadıysa yerelden dene (öncelik: status='registered')
  if ((!phone && !address) && userEmail && useLocalDb()) {
    try {
      let regRows = await queryLocal<{ phone?: string; address?: string }>(
        `SELECT phone, address FROM registration_requests WHERE email = $1 AND status = 'registered' ORDER BY created_at DESC LIMIT 1`,
        [userEmail]
      );
      if (!regRows?.length) {
        regRows = await queryLocal<{ phone?: string; address?: string }>(
          `SELECT phone, address FROM registration_requests WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
          [userEmail]
        );
      }
      const reg = regRows?.[0];
      if (reg) {
        phone = phone ?? ((reg.phone ?? '').trim() || null);
        address = address ?? ((reg.address ?? '').trim() || null);
      }
    } catch {
      // ignore if table doesn't exist or query fails
    }
  }
  const userWithContact = { ...u, phone: phone ?? undefined, address: address ?? undefined };
  const { data: business } = u.business_id ? await supabase.from('businesses').select('*').eq('id', (u as { business_id: string }).business_id).single() : { data: null };
  const { data: subRaw } = (u as { business_id?: string }).business_id
    ? await supabase.from('subscriptions').select('*, plans(display_name, max_screens)').eq('business_id', (u as { business_id: string }).business_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const p = subRaw?.plans ? (Array.isArray(subRaw.plans) ? subRaw.plans[0] : subRaw.plans) as { display_name?: string; max_screens?: number } : null;
  const sub = subRaw
    ? { ...subRaw, plan_name: p?.display_name ?? null, plan_max_screens: p?.max_screens ?? null, plans: undefined }
    : null;
  const businessId = (u as { business_id?: string }).business_id;
  let subIds: string[] = [];
  if (businessId) {
    const { data: subs } = await supabase.from('subscriptions').select('id').eq('business_id', businessId);
    subIds = (subs ?? []).map((s: { id: string }) => s.id);
  }
  const [screensRes, paymentsRes, failuresRes] = await Promise.all([
    supabase.from('screens').select('*', { count: 'exact', head: true }).eq('business_id', businessId || ''),
    subIds.length > 0
      ? supabase.from('payments').select('*').in('subscription_id', subIds).eq('status', 'succeeded').order('payment_date', { ascending: false }).limit(50)
      : Promise.resolve({ data: [] }),
    businessId
      ? supabase.from('payment_failures').select('*').eq('business_id', businessId).order('attempted_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ]);
  const screensCount = screensRes.count ?? 0;
  const screensActive = 0;
  const screensInactive = 0;
  return Response.json({
    user: userWithContact,
    business: business ?? null,
    subscription: sub ?? null,
    screens_count: screensCount,
    screens_active: screensActive,
    screens_inactive: screensInactive,
    payments: paymentsRes.data ?? [],
    payment_failures: failuresRes.data ?? [],
  });
}

/** GET /reports/user/:userId/invoice/:paymentId - admin fatura görüntüleme/indirme */
export async function getInvoiceForUser(userId: string, paymentId: string, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  const supabase = getServerSupabase();
  const { data: u } = await supabase.from('users').select('email, business_id').eq('id', userId).single();
  if (!u) return Response.json({ message: 'User not found' }, { status: 404 });
  const { data: p } = await supabase.from('payments').select('*').eq('id', paymentId).single();
  if (!p) return Response.json({ message: 'Invoice not found' }, { status: 404 });
  const { data: sub } = await supabase.from('subscriptions').select('business_id, plan_id').eq('id', (p as { subscription_id: string }).subscription_id).single();
  if (!sub || (sub as { business_id: string }).business_id !== (u as { business_id: string }).business_id) return Response.json({ message: 'Invoice not found' }, { status: 404 });
  const { data: plan } = (sub as { plan_id?: string }).plan_id
    ? await supabase.from('plans').select('display_name').eq('id', (sub as { plan_id: string }).plan_id).single()
    : { data: null };
  const { data: biz } = await supabase.from('businesses').select('name').eq('id', (sub as { business_id: string }).business_id).single();
  let company: Record<string, string> = { company_name: 'MenuSlide', company_address: '', company_phone: '', company_email: '', footer_legal: '', footer_tax_id: '' };
  try {
    const { data: layout } = await supabase.from('invoice_layout').select('*').limit(1).maybeSingle();
    if (layout && typeof layout === 'object') company = layout as Record<string, string>;
  } catch {
    // invoice_layout tablosu yoksa varsayılan kullan
  }
  return Response.json({
    id: (p as { id: string }).id,
    invoice_number: (p as { invoice_number?: string }).invoice_number ?? `INV-${String((p as { id: string }).id).slice(0, 8)}`,
    amount: (p as { amount: number }).amount,
    currency: (p as { currency?: string }).currency ?? 'cad',
    status: (p as { status: string }).status,
    payment_date: (p as { payment_date: string }).payment_date,
    plan_name: (plan as { display_name?: string })?.display_name ?? null,
    business_name: (biz as { name?: string })?.name ?? null,
    customer_email: (u as { email: string }).email,
    company,
  });
}

/** POST /reports/subscription/:subscriptionId/mark-paid (admin) - Paket eklendiğinde otomatik fatura oluşturur */
export async function markSubscriptionPaid(subscriptionId: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  const supabase = getServerSupabase();
  let body: { period_months?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const months = body.period_months ?? 1;
  const { data: sub } = await supabase.from('subscriptions').select('current_period_end, plan_id').eq('id', subscriptionId).single();
  if (!sub) return Response.json({ message: 'Subscription not found' }, { status: 404 });
  const end = new Date((sub as { current_period_end: string }).current_period_end || Date.now());
  end.setMonth(end.getMonth() + months);
  const { error } = await supabase.from('subscriptions').update({ current_period_end: end.toISOString(), status: 'active' }).eq('id', subscriptionId);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  // Otomatik fatura oluştur (paket eklendiğinde)
  const planId = (sub as { plan_id?: string }).plan_id;
  if (planId) {
    const amount = useLocalDb()
      ? ((await queryOne<{ price_monthly: number }>('SELECT price_monthly FROM plans WHERE id = $1', [planId]))?.price_monthly ?? 0)
      : ((await supabase.from('plans').select('price_monthly').eq('id', planId).single()).data as { price_monthly?: number })?.price_monthly ?? 0;
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
      await mirrorToSupabase('payments', 'insert', { row: inserted });
    } else {
      await supabase.from('payments').insert(paymentRow);
    }
  }
  await insertAdminActivityLog(user, { action_type: 'subscription_mark_paid', page_key: 'reports', resource_type: 'subscription', resource_id: subscriptionId, details: { period_months: months } });
  return Response.json({ message: 'Marked as paid' });
}

/** GET /reports/activity (admin) */
export async function getActivityLog(request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const userId = searchParams.get('user_id');
  if (useLocalDb()) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (from) { params.push(from); conditions.push(`a.created_at >= $${params.length}`); }
    if (to) {
      const toVal = /^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999Z` : to;
      params.push(toVal);
      conditions.push(`a.created_at <= $${params.length}`);
    }
    if (userId) { params.push(userId); conditions.push(`a.user_id = $${params.length}`); }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const rows = await queryLocal(`SELECT a.*, u.email as user_email FROM admin_activity_log a LEFT JOIN users u ON a.user_id = u.id${where} ORDER BY a.created_at DESC LIMIT 200`, params);
    return Response.json(rows ?? []);
  }
  const supabase = getServerSupabase();
  let q = supabase.from('admin_activity_log').select('*, users(email)').order('created_at', { ascending: false }).limit(200);
  if (from) q = q.gte('created_at', from);
  if (to) {
    // to=YYYY-MM-DD isteğe end-of-day ekle, bugünkü kayıtlar dahil olsun
    const toVal = /^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999Z` : to;
    q = q.lte('created_at', toVal);
  }
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) return Response.json({ message: error.message }, { status: 500 });
  // Supabase join returns users: { email } or users: null; flatten to user_email
  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const u = r.users as { email?: string } | { email?: string }[] | null;
    const email = Array.isArray(u) ? u[0]?.email : u?.email;
    const out = { ...r, user_email: email ?? null };
    delete (out as Record<string, unknown>).users;
    return out;
  });
  return Response.json(rows);
}

/** POST /reports/activity (admin) */
export async function logActivity(request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  let body: { action_type?: string; page_key?: string; resource_type?: string; resource_id?: string; details?: Record<string, unknown> } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { insertAdminActivityLog } = await import('@/lib/api-backend/admin-activity-log');
  await insertAdminActivityLog(user, {
    action_type: body.action_type ?? 'view',
    page_key: body.page_key ?? '',
    resource_type: body.resource_type ?? undefined,
    resource_id: body.resource_id ?? undefined,
    details: body.details ?? undefined,
  });
  return Response.json({ success: true });
}

/** DELETE /reports/activity - tüm logları temizle (sadece super_admin) */
export async function clearActivityLog(user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin') return Response.json({ message: 'Super admin only' }, { status: 403 });
  if (useLocalDb()) {
    const { getLocalPg } = await import('@/lib/api-backend/db-local');
    const client = await getLocalPg();
    await client.query('DELETE FROM admin_activity_log');
    return Response.json({ message: 'Tüm loglar silindi', deleted: true });
  }
  const supabase = getServerSupabase();
  const { error } = await supabase.from('admin_activity_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ message: 'Tüm loglar silindi', deleted: true });
}

/** GET /reports/activity-users (admin) */
export async function getActivityAdminUsers(user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  if (useLocalDb()) {
    const rows = await queryLocal<{ id: string; email: string; full_name: string }>('SELECT id, email, full_name FROM users WHERE role IN ($1, $2) ORDER BY email', ['super_admin', 'admin']);
    return Response.json(rows ?? []);
  }
  const supabase = getServerSupabase();
  const { data } = await supabase.from('users').select('id, email, full_name').in('role', ['super_admin', 'admin']).order('email');
  return Response.json(data ?? []);
}
