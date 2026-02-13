import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const SLIDE_IMAGE_BASE =
  process.env.NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, '');

/**
 * POST /api/device/register — Enterprise TV app activation.
 * Body: { displayCode, deviceId, deviceModel?, osVersion? }
 * Returns: { deviceToken, layout, layoutVersion, refreshIntervalSeconds } — no video.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SERVER_NOT_CONFIGURED', message: 'Supabase env not set.' },
        { status: 503 }
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const displayCode = String(body?.displayCode ?? body?.displaycode ?? '').trim();
    const deviceId = String(body?.deviceId ?? body?.deviceid ?? '').trim();
    if (!displayCode) {
      return NextResponse.json({ error: 'displayCode required' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const { data: byBroadcast, error: errBroadcast } = await supabase
      .from('screens')
      .select('id, public_slug, public_token, broadcast_code, updated_at')
      .eq('broadcast_code', displayCode)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (errBroadcast) console.error('[device/register]', errBroadcast.message);
    let screen = byBroadcast ?? undefined;
    if (!screen && /^\d+$/.test(displayCode)) {
      const { data: byNum } = await supabase
        .from('screens')
        .select('id, public_slug, public_token, broadcast_code, updated_at')
        .eq('broadcast_code', parseInt(displayCode, 10))
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      screen = byNum ?? undefined;
    }
    if (!screen) {
      const { data: bySlug } = await supabase
        .from('screens')
        .select('id, public_slug, public_token, broadcast_code, updated_at')
        .eq('public_slug', displayCode)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      screen = bySlug ?? undefined;
    }
    if (!screen) {
      const { data: byToken } = await supabase
        .from('screens')
        .select('id, public_slug, public_token, broadcast_code, updated_at')
        .eq('public_token', displayCode)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      screen = byToken ?? undefined;
    }

    if (!screen) {
      return NextResponse.json(
        { error: 'CODE_NOT_FOUND', message: 'Display code not found or screen inactive' },
        { status: 404 }
      );
    }

    const screenId = (screen as { id: string }).id;
    const deviceToken = `dt_${screenId}_${deviceId.slice(0, 8)}_${Date.now()}`;

    const { data: rotations } = await supabase
      .from('screen_template_rotations')
      .select('template_id, full_editor_template_id, display_duration, display_order')
      .eq('screen_id', screenId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const ordered = rotations ?? [];
    const slides: Array<{ type: string; url?: string; title?: string; description?: string; duration: number }> = [];

    for (const r of ordered) {
      const templateId =
        (r as { full_editor_template_id?: string | null }).full_editor_template_id ||
        (r as { template_id?: string }).template_id;
      const duration = Math.max(1, (r as { display_duration?: number }).display_duration ?? 8);

      if (SLIDE_IMAGE_BASE && templateId) {
        slides.push({ type: 'image', url: `${SLIDE_IMAGE_BASE}/slides/${screenId}/${templateId}.jpg`, duration });
      } else {
        slides.push({ type: 'text', title: 'Slide', description: '', duration });
      }
    }

    if (slides.length === 0) {
      slides.push({ type: 'text', title: 'No content', description: 'Add templates in Admin.', duration: 10 });
    }

    const version = (screen as { updated_at?: string }).updated_at ?? new Date().toISOString();
    const layout = {
      version,
      backgroundColor: '#000000',
      slides,
    };

    return NextResponse.json({
      deviceToken,
      layout,
      layoutVersion: version,
      refreshIntervalSeconds: 300,
    });
  } catch (e) {
    console.error('[device/register]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
