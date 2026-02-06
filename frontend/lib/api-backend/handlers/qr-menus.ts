import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://menuslide.com');

/** GET /qr-menus/business/:businessId - get or create QR menu for business */
export async function getOrCreate(businessId: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  if (user.role !== 'super_admin') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (u?.business_id !== businessId) return Response.json({ message: 'Access denied' }, { status: 403 });
  }
  const { data: biz } = await supabase.from('businesses').select('slug').eq('id', businessId).single();
  const businessSlug = (biz as { slug?: string } | null)?.slug?.trim() || null;
  const screenId = new URL(request.url).searchParams.get('screenId') || null;

  const { data: existing } = await supabase.from('qr_menus').select('*').eq('business_id', businessId).is('screen_id', screenId).limit(1).maybeSingle();
  if (existing) {
    const shortUrl = businessSlug ? `${APP_URL}/qr/${businessSlug}` : `${APP_URL}/qr/${businessId}?token=${(existing as { token?: string }).token || ''}`;
    return Response.json({ ...existing, qr_code_data: shortUrl });
  }

  const token = randomBytes(16).toString('hex');
  const shortUrl = businessSlug ? `${APP_URL}/qr/${businessSlug}` : `${APP_URL}/qr/${businessId}?token=${token}`;
  const { data: inserted, error } = await supabase.from('qr_menus').insert({
    business_id: businessId,
    screen_id: screenId,
    qr_code_data: shortUrl,
    token,
    is_active: true,
  }).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ ...inserted, qr_code_data: shortUrl });
}
