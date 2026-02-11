import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/device/register — Enterprise TV app activation.
 * Body: { displayCode, deviceId, deviceModel?, osVersion? }
 * Returns: { deviceToken, layout?, videoUrls?, refreshIntervalSeconds }
 */
export async function POST(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SERVER_NOT_CONFIGURED', message: 'Supabase env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) not set. Set in Vercel/host env.' },
        { status: 503 }
      );
    }
    const body = await request.json();
    const displayCode = String(body?.displayCode ?? '').trim();
    const deviceId = String(body?.deviceId ?? '').trim();
    if (!displayCode) {
      return NextResponse.json({ error: 'displayCode required' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    // Önce broadcast_code ile ara (string), sayısal kod ise sayı ile de dene
    const { data: byBroadcast, error: errBroadcast } = await supabase
      .from('screens')
      .select('id, public_slug, public_token, broadcast_code')
      .eq('broadcast_code', displayCode)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (errBroadcast) {
      console.error('[device/register] broadcast_code query error:', errBroadcast.message, errBroadcast.code);
    }
    let screen = byBroadcast ?? undefined;
    if (!screen && /^\d+$/.test(displayCode)) {
      const { data: byNum } = await supabase
        .from('screens')
        .select('id, public_slug, public_token, broadcast_code')
        .eq('broadcast_code', parseInt(displayCode, 10))
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      screen = byNum ?? undefined;
    }
    if (!screen) {
      const { data: bySlug, error: errSlug } = await supabase
        .from('screens')
        .select('id, public_slug, public_token, broadcast_code')
        .eq('public_slug', displayCode)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (errSlug) console.error('[device/register] public_slug query error:', errSlug.message);
      screen = bySlug ?? undefined;
    }
    if (!screen) {
      const { data: byToken, error: errToken } = await supabase
        .from('screens')
        .select('id, public_slug, public_token, broadcast_code')
        .eq('public_token', displayCode)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (errToken) console.error('[device/register] public_token query error:', errToken.message);
      screen = byToken ?? undefined;
    }

    if (!screen) {
      return NextResponse.json(
        { error: 'CODE_NOT_FOUND', message: 'Display code not found or screen inactive' },
        { status: 404 }
      );
    }

    const deviceToken = `dt_${(screen as { id: string }).id}_${deviceId.slice(0, 8)}_${Date.now()}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menuslide.com';
    const displaySlug = (screen as { public_slug?: string; public_token?: string }).public_slug || (screen as { public_token?: string }).public_token || (screen as { broadcast_code?: string }).broadcast_code;

    const layout = {
      version: 1,
      backgroundColor: '#000000',
      components: [
        {
          id: 'text1',
          type: 'text',
          x: 24,
          y: 24,
          width: 600,
          height: 48,
          zIndex: 1,
          text: 'MenuSlide - Native Player',
          textColor: '#FFFFFF',
          textSize: 28,
        },
        {
          id: 'text2',
          type: 'text',
          x: 24,
          y: 80,
          width: 800,
          height: 32,
          zIndex: 1,
          text: `Display: ${displaySlug}. Add videoUrl (direct .mp4/.m3u8) in Admin for video.`,
          textColor: '#AAAAAA',
          textSize: 16,
        },
      ],
    };

    return NextResponse.json({
      deviceToken,
      layout,
      videoUrls: [`${appUrl}/display/${displaySlug}`],
      refreshIntervalSeconds: 300,
    });
  } catch (e) {
    console.error('[device/register]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
