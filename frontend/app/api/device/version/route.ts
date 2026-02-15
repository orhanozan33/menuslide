import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/device/version — Lightweight layout version check.
 * Headers: X-Device-Token or Authorization: Bearer
 * Query: ?deviceToken=xxx
 * Returns layoutVersion (ISO timestamp). Client compares with cached; if different, fetch layout.
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

    const match = /^dt_([a-f0-9-]+)_/.exec(deviceToken);
    const screenId = match?.[1];
    if (!screenId) {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }

    const supabase = getServerSupabase();
    const { data: screen, error } = await supabase
      .from('screens')
      .select('updated_at')
      .eq('id', screenId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error || !screen) {
      return NextResponse.json({ error: 'invalid token' }, { status: 404 });
    }

    const { data: rotations } = await supabase
      .from('screen_template_rotations')
      .select('updated_at')
      .eq('screen_id', screenId)
      .eq('is_active', true);
    const rotationMaxUpdated = (rotations ?? []).reduce((max, r) => {
      const u = (r as { updated_at?: string }).updated_at;
      return u && (!max || u > max) ? u : max;
    }, '' as string);
    const screenUpdated = (screen as { updated_at?: string }).updated_at ?? new Date().toISOString();
    const layoutVersion =
      rotationMaxUpdated && rotationMaxUpdated > screenUpdated ? rotationMaxUpdated : screenUpdated;

    return NextResponse.json(
      {
        layoutVersion,
        refreshIntervalSeconds: 60,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (e) {
    console.error('[device/version]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
