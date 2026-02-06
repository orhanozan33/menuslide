import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  verifyToken,
  signToken,
  loginWithPassword,
  getMe,
  type JwtPayload,
} from '@/lib/auth-server';
import * as bcrypt from 'bcryptjs';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'business';
  return `${base}-${Date.now().toString(36)}`;
}

/** POST /auth/login */
export async function postLogin(req: NextRequest): Promise<Response> {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Invalid body' }, { status: 400 });
  }
  const email = body.email;
  const password = body.password;
  if (!email || !password) {
    return Response.json({ message: 'Invalid credentials' }, { status: 401 });
  }
  try {
    const { user, token } = await loginWithPassword(email, password);
    return Response.json({ user, token });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid credentials';
    if (/LOCAL_DB_CONNECTION_FAILED|ECONNREFUSED|connect ENOENT/i.test(msg)) {
      return Response.json(
        { message: 'Veritabanı bağlantısı yok. .env.local içinde USE_LOCAL_DB kapatın veya PostgreSQL\'i başlatın.' },
        { status: 503 }
      );
    }
    if (msg.startsWith('Supabase:')) {
      return Response.json({ message: msg }, { status: 500 });
    }
    return Response.json({ message: msg }, { status: 401 });
  }
}

/** GET /auth/me */
export async function getAuthMe(req: NextRequest, user: JwtPayload): Promise<Response> {
  const me = await getMe(user.userId);
  if (!me) {
    return Response.json({ message: 'User not found or session expired' }, { status: 401 });
  }
  return Response.json(me);
}

/** POST /auth/register */
export async function postRegister(req: NextRequest): Promise<Response> {
  let body: {
    businessName?: string;
    email?: string;
    password?: string;
    phone?: string;
    address?: string;
    province?: string;
    city?: string;
    reference_number?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Invalid body' }, { status: 400 });
  }
  const email = String(body.email ?? '').trim();
  const businessName = String(body.businessName ?? '').trim();
  const password = body.password;
  if (!email || !businessName || !password) {
    return Response.json({ message: 'Email, business name and password are required' }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) {
    return Response.json({ message: 'Email already registered' }, { status: 409 });
  }

  const slug = slugify(businessName);
  const passwordHash = await bcrypt.hash(password, 10);

  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .insert({ name: businessName, slug, is_active: true })
    .select('id, name')
    .single();
  if (bizErr || !business) {
    return Response.json({ message: bizErr?.message || 'Failed to create business' }, { status: 500 });
  }

  const { data: refRows } = await supabase.from('users').select('reference_number');
  const nums = (refRows || [])
    .map((r: any) => parseInt(String(r?.reference_number ?? ''), 10))
    .filter((n: number) => !Number.isNaN(n) && n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const newRef = String(next).padStart(5, '0');

  let referredByUserId: string | null = null;
  const refInput = body.reference_number ? String(body.reference_number).trim().replace(/\s/g, '') : '';
  if (refInput) {
    const padded = /^\d+$/.test(refInput) ? refInput.padStart(5, '0') : refInput;
    const { data: referrer } = await supabase
      .from('users')
      .select('id')
      .eq('reference_number', padded)
      .limit(1)
      .maybeSingle();
    if (referrer) referredByUserId = referrer.id;
  }

  const { data: user, error: userErr } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: passwordHash,
      role: 'business_user',
      business_id: business.id,
      reference_number: newRef,
      referred_by_user_id: referredByUserId,
    })
    .select('id, email, role, business_id, reference_number')
    .single();
  if (userErr || !user) {
    return Response.json({ message: userErr?.message || 'Failed to create user' }, { status: 500 });
  }

  const token = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      business_id: user.business_id,
      reference_number: user.reference_number ?? undefined,
    },
    token,
  });
}

/** PATCH /auth/me */
export async function patchAuthMe(req: NextRequest, user: JwtPayload): Promise<Response> {
  let body: { preferred_locale?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(await getMe(user.userId));
  }
  if (body.preferred_locale == null) {
    const me = await getMe(user.userId);
    return Response.json(me ?? {});
  }
  const locale = body.preferred_locale === 'tr' || body.preferred_locale === 'fr' ? body.preferred_locale : 'en';
  const supabase = getServerSupabase();
  await supabase.from('users').update({ preferred_locale: locale, updated_at: new Date().toISOString() }).eq('id', user.userId);
  return Response.json({ preferred_locale: locale });
}

/** GET /auth/impersonate is not implemented in this handler; POST is */
export async function postImpersonate(req: NextRequest, adminUser: JwtPayload): Promise<Response> {
  if (adminUser.role !== 'super_admin' && adminUser.role !== 'admin') {
    return Response.json({ message: 'Sadece admin veya super_admin kullanıcı adına giriş yapabilir' }, { status: 403 });
  }
  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Invalid body' }, { status: 400 });
  }
  const targetUserId = body.user_id;
  if (!targetUserId || targetUserId === adminUser.userId) {
    return Response.json({ message: 'Impersonate için geçerli user_id gerekir' }, { status: 400 });
  }
  const supabase = getServerSupabase();
  const { data: target } = await supabase
    .from('users')
    .select('id, email, role, business_id')
    .eq('id', targetUserId)
    .maybeSingle();
  if (!target) {
    return Response.json({ message: 'User not found' }, { status: 404 });
  }
  const token = await signToken({
    userId: target.id,
    email: target.email,
    role: target.role,
  });
  return Response.json({
    user: {
      id: target.id,
      email: target.email,
      role: target.role,
      business_id: target.business_id,
    },
    token,
  });
}

/** GET /auth/account */
export async function getAccount(req: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: u } = await supabase.from('users').select('id, email, reference_number, business_id').eq('id', user.userId).single();
  if (!u) return Response.json({ message: 'User not found' }, { status: 404 });
  const { data: biz } = u.business_id
    ? await supabase.from('businesses').select('name').eq('id', u.business_id).single()
    : { data: null };
  let subscription: { plan_name: string | null; current_period_start: string | null; current_period_end: string | null } | null = null;
  if (u.business_id) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('current_period_start, current_period_end, plan_id')
      .eq('business_id', u.business_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub) {
      const { data: plan } = (sub as any).plan_id
        ? await supabase.from('plans').select('display_name').eq('id', (sub as any).plan_id).maybeSingle()
        : { data: null };
      subscription = {
        plan_name: (plan as any)?.display_name ?? null,
        current_period_start: (sub as any).current_period_start ?? null,
        current_period_end: (sub as any).current_period_end ?? null,
      };
    }
  }
  const { data: referred } = await supabase
    .from('users')
    .select('id, email, created_at, reference_number, business_id')
    .eq('referred_by_user_id', user.userId)
    .eq('role', 'business_user')
    .order('created_at', { ascending: false });
  const referredUsers = (referred || []).map((r: any) => ({
    ...r,
    business_name: null,
  }));
  for (const r of referredUsers) {
    if (r.business_id) {
      const { data: b } = await supabase.from('businesses').select('name').eq('id', r.business_id).single();
      r.business_name = b?.name ?? null;
    }
  }
  return Response.json({
    user: { id: u.id, email: u.email, business_name: biz?.name ?? null, reference_number: u.reference_number ?? undefined },
    subscription,
    referred_users: referredUsers,
  });
}

/** POST /auth/change-password */
export async function changePassword(req: NextRequest, user: JwtPayload): Promise<Response> {
  let body: { current_password?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Invalid body' }, { status: 400 });
  }
  const { current_password, new_password } = body;
  if (!new_password || new_password.length < 6) {
    return Response.json({ message: 'New password must be at least 6 characters' }, { status: 400 });
  }
  const supabase = getServerSupabase();
  const { data: u } = await supabase.from('users').select('password_hash').eq('id', user.userId).single();
  if (!u) return Response.json({ message: 'User not found' }, { status: 404 });
  const valid = await bcrypt.compare(current_password || '', u.password_hash);
  if (!valid) return Response.json({ message: 'Current password is incorrect' }, { status: 401 });
  const hash = await bcrypt.hash(new_password, 10);
  await supabase.from('users').update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', user.userId);
  return Response.json({ message: 'Password updated' });
}

/** GET /auth/payments */
export async function getMyPayments(req: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
  if (!u?.business_id) return Response.json([]);
  const { data: subs } = await supabase.from('subscriptions').select('id').eq('business_id', u.business_id);
  const subIds = (subs || []).map((s: any) => s.id);
  if (subIds.length === 0) return Response.json([]);
  const { data: payments } = await supabase.from('payments').select('id, amount, currency, status, payment_date, invoice_number, subscription_id').in('subscription_id', subIds).order('payment_date', { ascending: false });
  const subIdsUsed = Array.from(new Set((payments || []).map((p: any) => p.subscription_id)));
  const { data: subPlans } = await supabase.from('subscriptions').select('id, plan_id').in('id', subIdsUsed);
  const { data: plans } = await supabase.from('plans').select('id, display_name').in('id', (subPlans || []).map((s: any) => s.plan_id).filter(Boolean));
  const planMap = Object.fromEntries((plans || []).map((p: any) => [p.id, p.display_name]));
  const subPlanMap = Object.fromEntries((subPlans || []).map((s: any) => [s.id, planMap[s.plan_id] ?? null]));
  const out = (payments || []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    payment_date: p.payment_date,
    invoice_number: p.invoice_number,
    plan_name: subPlanMap[p.subscription_id] ?? undefined,
  }));
  return Response.json(out);
}

/** GET /auth/invoices/:paymentId */
export async function getInvoice(req: NextRequest, user: JwtPayload, paymentId: string): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: u } = await supabase.from('users').select('business_id, email').eq('id', user.userId).single();
  if (!u?.business_id) return Response.json({ message: 'Not found' }, { status: 404 });
  const { data: p } = await supabase.from('payments').select('*').eq('id', paymentId).single();
  if (!p) return Response.json({ message: 'Invoice not found' }, { status: 404 });
  const { data: sub } = await supabase.from('subscriptions').select('business_id, plan_id').eq('id', (p as any).subscription_id).single();
  if (!sub || (sub as any).business_id !== u.business_id) return Response.json({ message: 'Invoice not found' }, { status: 404 });
  const { data: plan } = (sub as any).plan_id ? await supabase.from('plans').select('display_name').eq('id', (sub as any).plan_id).single() : { data: null };
  const { data: biz } = await supabase.from('businesses').select('name').eq('id', (sub as any).business_id).single();
  const layout = { company_name: 'MenuSlide', company_address: '', company_phone: '', company_email: '', footer_legal: '', footer_tax_id: '' };
  return Response.json({
    id: p.id,
    invoice_number: (p as any).invoice_number ?? `INV-${String(p.id).slice(0, 8)}`,
    amount: (p as any).amount,
    currency: (p as any).currency ?? 'cad',
    status: (p as any).status,
    payment_date: (p as any).payment_date,
    plan_name: (plan as any)?.display_name ?? null,
    business_name: (biz as any)?.name ?? null,
    customer_email: u.email,
    company: layout,
  });
}

/** GET /auth/admin-dashboard - simplified */
export async function getAdminDashboard(req: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: admin } = await supabase.from('users').select('id, email, reference_number').eq('id', user.userId).eq('role', 'admin').single();
  if (!admin) return Response.json({ message: 'Admin dashboard only for admin role' }, { status: 403 });
  const { data: referred } = await supabase
    .from('users')
    .select('id, email, created_at, reference_number, business_id')
    .eq('referred_by_user_id', user.userId)
    .eq('role', 'business_user')
    .order('created_at', { ascending: false });
  const referredUsers = (referred || []).map((r: any) => ({ ...r, business_name: null, total_paid: 0, last_payment_date: null, commission_earned: 0, payment_failure_count: 0 }));
  for (const r of referredUsers) {
    if (r.business_id) {
      const { data: b } = await supabase.from('businesses').select('name').eq('id', r.business_id).single();
      r.business_name = b?.name ?? null;
    }
  }
  return Response.json({
    admin_info: { id: admin.id, email: admin.email, reference_number: admin.reference_number ?? undefined },
    referred_users: referredUsers,
    income_summary: { referred_user_count: referredUsers.length, total_referred_payments: 0, total_commission: 0, commission_rate_percent: 30 },
    payment_statuses: referredUsers,
  });
}

export function requireAuth(authHeader: string | null): Promise<JwtPayload | null> {
  return verifyToken(authHeader);
}
