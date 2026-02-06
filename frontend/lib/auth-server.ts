import * as jose from 'jose';
import * as bcrypt from 'bcryptjs';
import { getServerSupabase } from './supabase-server';

const JWT_SECRET = process.env.JWT_SECRET || 'local-secret-key-change-in-production';
const ALG = 'HS256';

export type JwtPayload = { userId: string; email: string; role: string };

/** Verify Bearer token and return payload or null */
export async function verifyToken(authHeader: string | null): Promise<JwtPayload | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: [ALG] });
    const userId = payload.userId as string;
    const email = payload.email as string;
    const role = payload.role as string;
    if (!userId || !email || !role) return null;
    return { userId, email, role };
  } catch {
    return null;
  }
}

/** Sign JWT for user */
export async function signToken(payload: JwtPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime('7d')
    .sign(secret);
}

/** Login: validate email/password, return { user, token } or throw */
export async function loginWithPassword(email: string, password: string): Promise<{ user: any; token: string }> {
  const supabase = getServerSupabase();
  const emailNorm = String(email ?? '').trim().toLowerCase();
  if (!emailNorm || !password) {
    throw new Error('Invalid credentials');
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, email, password_hash, role, business_id, preferred_locale, reference_number')
    .eq('email', emailNorm)
    .maybeSingle();

  if (userError || !userRow) {
    throw new Error('Invalid credentials');
  }

  const businessId = userRow.business_id;
  if (businessId) {
    const { data: biz } = await supabase.from('businesses').select('is_active').eq('id', businessId).maybeSingle();
    if (userRow.role === 'business_user' && biz?.is_active === false) {
      throw new Error('Account is deactivated. Please contact admin.');
    }
  }

  let passwordHash = userRow.password_hash;
  if (passwordHash === 'temp_hash_will_be_updated') {
    const hash = await bcrypt.hash(password, 10);
    await supabase.from('users').update({ password_hash: hash }).eq('id', userRow.id);
    passwordHash = hash;
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = await signToken({
    userId: userRow.id,
    email: userRow.email,
    role: userRow.role,
  });

  const preferredLocale = (userRow.preferred_locale === 'tr' || userRow.preferred_locale === 'fr') ? userRow.preferred_locale : 'en';
  const user = {
    id: userRow.id,
    email: userRow.email,
    role: userRow.role,
    business_id: userRow.business_id,
    preferred_locale: preferredLocale,
    reference_number: userRow.reference_number ?? undefined,
  };

  return { user, token };
}

/** Get current user with admin_permissions if admin */
export async function getMe(userId: string): Promise<any | null> {
  const supabase = getServerSupabase();
  const { data: u, error } = await supabase
    .from('users')
    .select('id, email, role, business_id, preferred_locale, reference_number')
    .eq('id', userId)
    .maybeSingle();

  if (error || !u) return null;

  const me: any = {
    id: u.id,
    email: u.email,
    role: u.role,
    business_id: u.business_id,
    preferred_locale: (u.preferred_locale === 'tr' || u.preferred_locale === 'fr') ? u.preferred_locale : 'en',
    reference_number: u.reference_number ?? undefined,
  };

  if (u.role === 'admin') {
    const { data: perms } = await supabase
      .from('admin_permissions')
      .select('page_key, permission, actions')
      .eq('user_id', userId);
    me.admin_permissions = {};
    (perms || []).forEach((r: { page_key: string; permission: string; actions?: Record<string, boolean> | null }) => {
      const actions = r.actions && typeof r.actions === 'object' ? r.actions : {};
      me.admin_permissions[r.page_key] = { view: r.permission !== 'none', ...actions };
    });
  }

  return me;
}
