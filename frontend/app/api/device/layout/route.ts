import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/device/layout — Fetch layout by deviceToken.
 * Headers: Authorization: Bearer {deviceToken} or X-Device-Token: {deviceToken}
 * Query: ?deviceToken=xxx
 * Returns same layout format as POST /device/register.
 */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'SERVER_NOT_CONFIGURED' }, { status: 503 });
    }

    let deviceToken =
      request.headers.get('x-device-token')?.trim() ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
      request.nextUrl.searchParams.get('deviceToken')?.trim();

    if (!deviceToken) {
      return NextResponse.json({ error: 'deviceToken required' }, { status: 401 });
    }

    // Parse dt_{screenId}_{deviceId}_{ts} format
    const match = /^dt_([a-f0-9-]+)_/.exec(deviceToken);
    const screenId = match?.[1];
    if (!screenId) {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }

    const supabase = getServerSupabase();
    const { data: screen, error } = await supabase
      .from('screens')
      .select('id, public_slug, public_token, broadcast_code, stream_url')
      .eq('id', screenId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error || !screen) {
      return NextResponse.json({ error: 'invalid token' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menuslide.com';
    const displaySlug =
      (screen as { public_slug?: string }).public_slug ||
      (screen as { public_token?: string }).public_token ||
      (screen as { broadcast_code?: string }).broadcast_code;
    const streamUrl = (screen as { stream_url?: string | null }).stream_url?.trim();

    let layout: object;

    if (streamUrl && (streamUrl.endsWith('.m3u8') || streamUrl.endsWith('.mp4'))) {
      layout = {
        type: 'video',
        videoUrl: streamUrl,
        backgroundColor: '#000000',
      };
    } else {
      layout = {
        version: 1,
        type: 'components',
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
            text: `Display: ${displaySlug}. Set stream_url (HLS/MP4) in Admin for video.`,
            textColor: '#AAAAAA',
            textSize: 16,
          },
        ],
      };
    }

    return NextResponse.json({
      deviceToken,
      layout,
      refreshIntervalSeconds: 300,
    });
  } catch (e) {
    console.error('[device/layout]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
