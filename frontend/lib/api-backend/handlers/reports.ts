import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';

/** GET /reports/users - users with subscription status (admin) */
export async function getUsersWithSubscription(user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return Response.json({ message: 'Admin access required' }, { status: 403 });
  }
  const supabase = getServerSupabase();
  const { data: users } = await supabase.from('users').select('id, email, full_name, role, business_id, created_at').eq('role', 'business_user').order('created_at', { ascending: false }).limit(500);
  const businessIds = Array.from(new Set((users ?? []).map((u: { business_id?: string }) => u.business_id).filter(Boolean))) as string[];
  let activeSet = new Set<string>();
  if (businessIds.length > 0) {
    const { data: subs } = await supabase.from('subscriptions').select('business_id').eq('status', 'active').in('business_id', businessIds);
    activeSet = new Set((subs ?? []).map((s: { business_id: string }) => s.business_id));
  }
  const list = (users ?? []).map((u: { business_id?: string } & Record<string, unknown>) => ({
    ...u,
    has_active_subscription: u.business_id ? activeSet.has(u.business_id) : false,
  }));
  return Response.json(list);
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

  const [
    totalUsersRes,
    totalBusinessesRes,
    totalScreensRes,
    newUsers7dRes,
    newUsers30dRes,
    paymentsTotal,
    paymentsThisMonth,
    paymentsRange,
    activeSubsRes,
    totalSubsRes,
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business_user'),
    supabase.from('businesses').select('*', { count: 'exact', head: true }),
    supabase.from('screens').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business_user').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business_user').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('payments').select('amount').eq('status', 'succeeded'),
    supabase.from('payments').select('amount').eq('status', 'succeeded').gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    hasDateRange ? supabase.from('payments').select('amount').eq('status', 'succeeded').gte('payment_date', revenueFrom!).lte('payment_date', revenueTo!) : Promise.resolve({ data: [] as { amount: number }[] }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
  ]);
  const totalUsers = totalUsersRes.count ?? 0;
  const totalBusinesses = totalBusinessesRes.count ?? 0;
  const totalScreens = totalScreensRes.count ?? 0;
  const newUsers7d = newUsers7dRes.count ?? 0;
  const newUsers30d = newUsers30dRes.count ?? 0;
  const activeSubsCount = activeSubsRes.count ?? 0;
  const totalSubsCount = totalSubsRes.count ?? 0;

  const sum = (arr: { amount?: number }[] | null) => (arr ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const revenueTotal = sum(paymentsTotal.data as { amount: number }[] ?? null);
  const revenueThisMonth = sum(paymentsThisMonth.data as { amount: number }[] ?? null);
  const revenueInRange = hasDateRange ? sum(paymentsRange.data as { amount: number }[] ?? null) : null;

  const { data: usersWithBiz } = await supabase.from('users').select('id, business_id').eq('role', 'business_user');
  const bizIds = Array.from(new Set((usersWithBiz ?? []).map((u: { business_id?: string }) => u.business_id).filter(Boolean))) as string[];
  const { data: activeSubList } = await supabase.from('subscriptions').select('business_id').eq('status', 'active').in('business_id', bizIds.length ? bizIds : ['']);
  const activeBizSet = new Set((activeSubList ?? []).map((s: { business_id: string }) => s.business_id));
  const usersWithSubscription = (usersWithBiz ?? []).filter((u: { business_id?: string }) => u.business_id && activeBizSet.has(u.business_id)).length;
  const usersWithoutSubscription = (usersWithBiz ?? []).length - usersWithSubscription;
  const businessesWithSubscription = activeBizSet.size;
  const businessesWithoutSubscription = Math.max(0, totalBusinesses - businessesWithSubscription);

  return Response.json({
    totalUsers,
    totalBusinesses,
    totalScreens,
    newUsers7d,
    newUsers30d,
    activeSubscriptions: activeSubsCount,
    totalSubscriptions: totalSubsCount,
    usersWithSubscription,
    usersWithoutSubscription,
    businessesWithSubscription,
    businessesWithoutSubscription,
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
  return Response.json({
    recentPayments: paymentsRes.data ?? [],
    failedPayments: failuresRes.data ?? [],
    overdueSubscriptions,
  });
}

/** GET /reports/user/:userId - user detail report (admin) */
export async function getUserDetailReport(userId: string, currentUserId: string, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  const supabase = getServerSupabase();
  const { data: u } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!u) return Response.json({ message: 'User not found' }, { status: 404 });
  const { data: business } = u.business_id ? await supabase.from('businesses').select('*').eq('id', (u as { business_id: string }).business_id).single() : { data: null };
  const { data: sub } = (u as { business_id?: string }).business_id
    ? await supabase.from('subscriptions').select('*').eq('business_id', (u as { business_id: string }).business_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const { count: screensCount } = await supabase.from('screens').select('*', { count: 'exact', head: true }).eq('business_id', (u as { business_id: string }).business_id || '');
  return Response.json({
    user: u,
    business: business ?? null,
    subscription: sub ?? null,
    screens_count: screensCount ?? 0,
    screens_active: 0,
    screens_inactive: 0,
  });
}

/** POST /reports/subscription/:subscriptionId/mark-paid (admin) */
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
  const { data: sub } = await supabase.from('subscriptions').select('current_period_end').eq('id', subscriptionId).single();
  if (!sub) return Response.json({ message: 'Subscription not found' }, { status: 404 });
  const end = new Date((sub as { current_period_end: string }).current_period_end || Date.now());
  end.setMonth(end.getMonth() + months);
  const { error } = await supabase.from('subscriptions').update({ current_period_end: end.toISOString(), status: 'active' }).eq('id', subscriptionId);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ message: 'Marked as paid' });
}

/** GET /reports/activity (admin) */
export async function getActivityLog(request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const userId = searchParams.get('user_id');
  let q = supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(200);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** POST /reports/activity (admin) */
export async function logActivity(request: NextRequest, user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  const supabase = getServerSupabase();
  let body: { action_type?: string; page_key?: string; resource_type?: string; resource_id?: string; details?: Record<string, unknown> } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { error } = await supabase.from('admin_activity_log').insert({
    user_id: user.userId,
    action_type: body.action_type ?? 'view',
    page_key: body.page_key ?? '',
    resource_type: body.resource_type ?? null,
    resource_id: body.resource_id ?? null,
    details: body.details ?? null,
  });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ success: true });
}

/** GET /reports/activity-users (admin) */
export async function getActivityAdminUsers(user: JwtPayload): Promise<Response> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return Response.json({ message: 'Admin required' }, { status: 403 });
  const supabase = getServerSupabase();
  const { data } = await supabase.from('users').select('id, email, full_name').in('role', ['super_admin', 'admin']).order('email');
  return Response.json(data ?? []);
}
