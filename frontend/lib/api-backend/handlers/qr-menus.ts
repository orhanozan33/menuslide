import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { useLocalDb, queryLocal, queryOne } from '@/lib/api-backend/db-local';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://menuslide.com');

/** GET /qr-menus/slug/:slug - Public: slug'dan business_id + token çözümle (case-insensitive) */
export async function resolveBySlug(slug: string): Promise<Response> {
  try {
    const slugNorm = String(slug ?? '').trim();
    if (!slugNorm) return Response.json({ message: 'Slug required' }, { status: 400 });
    if (useLocalDb()) {
      const biz = await queryOne<{ id: string }>('SELECT id FROM businesses WHERE LOWER(slug) = LOWER($1) AND is_active = true', [slugNorm]);
      if (!biz) return Response.json({ message: 'Business not found' }, { status: 404 });
      const qr = await queryOne<{ token: string }>('SELECT token FROM qr_menus WHERE business_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1', [biz.id]);
      return Response.json({ business_id: biz.id, token: qr?.token || null });
    }
    const supabase = getServerSupabase();
    const { data: biz } = await supabase.from('businesses').select('id').ilike('slug', slugNorm).eq('is_active', true).maybeSingle();
    if (!biz) return Response.json({ message: 'Business not found' }, { status: 404 });
    const { data: qr } = await supabase.from('qr_menus').select('token').eq('business_id', biz.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return Response.json({ business_id: biz.id, token: (qr as { token?: string } | null)?.token || null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ message: msg }, { status: 500 });
  }
}

/** POST /qr-menus/view/:token - Public: QR görüntüleme kaydı */
export async function recordView(token: string, request: NextRequest): Promise<Response> {
  try {
    if (useLocalDb()) {
      const qr = await queryOne<{ id: string }>('SELECT id FROM qr_menus WHERE token = $1 AND is_active = true', [token]);
      if (qr) {
        await queryLocal('INSERT INTO qr_menu_views (qr_menu_id, viewed_at) VALUES ($1, NOW())', [qr.id]);
      }
      return Response.json({ ok: true });
    }
    const supabase = getServerSupabase();
    const { data: qr } = await supabase.from('qr_menus').select('id').eq('token', token).eq('is_active', true).maybeSingle();
    if (qr) {
      await supabase.from('qr_menu_views').insert({ qr_menu_id: qr.id });
    }
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ message: msg }, { status: 500 });
  }
}

/** GET /qr-menus/business/:businessId - get or create QR menu for business */
export async function getOrCreate(businessId: string, request: NextRequest, user: JwtPayload): Promise<Response> {
  try {
    const supabase = getServerSupabase();
    if (user.role !== 'super_admin') {
      const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
      if (u?.business_id !== businessId) return Response.json({ message: 'Access denied' }, { status: 403 });
    }
    const { data: biz } = await supabase.from('businesses').select('slug').eq('id', businessId).single();
    const businessSlug = (biz as { slug?: string } | null)?.slug?.trim() || null;
    const screenId = new URL(request.url).searchParams.get('screenId') || null;

    const { data: existing, error: fetchError } = await supabase.from('qr_menus').select('*').eq('business_id', businessId).is('screen_id', screenId).limit(1).maybeSingle();
    if (fetchError) {
      if (/schema cache|relation.*does not exist|qr_menus/i.test(fetchError.message)) {
        return Response.json({ message: 'QR menü tablosu henüz oluşturulmamış. Supabase SQL Editor\'da database/supabase-add-payment-failures-and-qr-menus.sql dosyasını çalıştırın.' }, { status: 503 });
      }
      return Response.json({ message: fetchError.message }, { status: 500 });
    }
    const shortUrl = businessSlug ? `${APP_URL}/qr/${businessSlug}` : `${APP_URL}/qr/${businessId}?token=${(existing as { token?: string })?.token || ''}`;
    if (existing) {
      const qrCodeImageUrl = (existing as { qr_code_url?: string }).qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}`;
      return Response.json({ ...existing, qr_code_data: shortUrl, qr_code_url: qrCodeImageUrl });
    }

    const token = randomBytes(16).toString('hex');
    const newShortUrl = businessSlug ? `${APP_URL}/qr/${businessSlug}` : `${APP_URL}/qr/${businessId}?token=${token}`;
    const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(newShortUrl)}`;
    const { data: inserted, error } = await supabase.from('qr_menus').insert({
      business_id: businessId,
      screen_id: screenId,
      qr_code_data: newShortUrl,
      qr_code_url: qrCodeImageUrl,
      token,
      is_active: true,
    }).select().single();
    if (error) return Response.json({ message: error.message }, { status: 500 });
    return Response.json({ ...inserted, qr_code_data: newShortUrl, qr_code_url: qrCodeImageUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/schema cache|qr_menus|relation.*does not exist/i.test(msg)) {
      return Response.json({ message: 'QR menü özelliği henüz yapılandırılmamış.' }, { status: 503 });
    }
    throw e;
  }
}
