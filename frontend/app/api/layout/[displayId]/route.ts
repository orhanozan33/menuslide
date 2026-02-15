import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const SLIDE_IMAGE_BASE =
  process.env.NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, '');

/**
 * GET /api/layout/{displayId} — Public layout by slug or screen id.
 * Web ve Roku aynı endpoint: versioned JPG URL'leri, Cache-Control: no-cache.
 * displayId = public_slug, public_token, broadcast_code veya screen uuid.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const displayId = (await params).displayId?.trim();
    if (!displayId) {
      return NextResponse.json({ error: 'displayId required' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'SERVER_NOT_CONFIGURED' }, { status: 503 });
    }

    type ScreenRow = { id: string; updated_at?: string; layout_snapshot_version?: string | null };
    let screen: ScreenRow | null = null;
    const { data: bySlug } = await supabase
      .from('screens')
      .select('id, updated_at, layout_snapshot_version')
      .eq('is_active', true)
      .eq('public_slug', displayId)
      .limit(1)
      .maybeSingle();
    if (bySlug) screen = bySlug as ScreenRow;
    if (!screen) {
      const { data: byToken } = await supabase
        .from('screens')
        .select('id, updated_at, layout_snapshot_version')
        .eq('is_active', true)
        .eq('public_token', displayId)
        .limit(1)
        .maybeSingle();
      if (byToken) screen = byToken as ScreenRow;
    }
    if (!screen) {
      const { data: byCode } = await supabase
        .from('screens')
        .select('id, updated_at, layout_snapshot_version')
        .eq('is_active', true)
        .eq('broadcast_code', displayId)
        .limit(1)
        .maybeSingle();
      if (byCode) screen = byCode as ScreenRow;
    }
    if (!screen && /^[a-f0-9-]{36}$/i.test(displayId)) {
      const { data: byId } = await supabase
        .from('screens')
        .select('id, updated_at, layout_snapshot_version')
        .eq('is_active', true)
        .eq('id', displayId)
        .limit(1)
        .maybeSingle();
      if (byId) screen = byId as ScreenRow;
    }
    if (!screen) {
      const { data: byNum } = await supabase
        .from('screens')
        .select('id, updated_at, layout_snapshot_version')
        .eq('is_active', true)
        .eq('broadcast_code', /^\d+$/.test(displayId) ? parseInt(displayId, 10) : displayId)
        .limit(1)
        .maybeSingle();
      if (byNum) screen = byNum as ScreenRow;
    }

    if (!screen) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const screenId = (screen as { id: string }).id;
    const versionHash = (screen as { layout_snapshot_version?: string | null }).layout_snapshot_version;

    const { data: rotations } = await supabase
      .from('screen_template_rotations')
      .select('template_id, full_editor_template_id, display_duration, display_order, transition_effect, transition_duration, updated_at')
      .eq('screen_id', screenId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const ordered = rotations ?? [];
    const rotationMaxUpdated = ordered.length
      ? ordered.reduce((max, r) => {
          const u = (r as { updated_at?: string }).updated_at;
          return u && (!max || u > max) ? u : max;
        }, '' as string)
      : '';
    const screenUpdated = (screen as { updated_at?: string }).updated_at ?? new Date().toISOString();
    const version = versionHash || (rotationMaxUpdated && rotationMaxUpdated > screenUpdated ? rotationMaxUpdated : screenUpdated);

    const slides: Array<{
      type: string;
      url?: string;
      title?: string;
      description?: string;
      duration: number;
      transition_effect?: string;
      transition_duration?: number;
    }> = [];

    ordered.forEach((r, index) => {
      const templateId =
        (r as { full_editor_template_id?: string | null }).full_editor_template_id ||
        (r as { template_id?: string }).template_id;
      const duration = Math.max(1, (r as { display_duration?: number }).display_duration ?? 8);
      const transitionEffect = (r as { transition_effect?: string }).transition_effect ?? 'slide-left';
      const transitionDuration = Math.min(5000, Math.max(100, (r as { transition_duration?: number }).transition_duration ?? 5000));
      const baseSlide = {
        duration,
        transition_effect: transitionEffect,
        transition_duration: transitionDuration,
      };
      if (SLIDE_IMAGE_BASE) {
        const url = versionHash
          ? `${SLIDE_IMAGE_BASE}/slides/${screenId}/${versionHash}/slide_${index}.jpg`
          : templateId
            ? `${SLIDE_IMAGE_BASE}/slides/${screenId}/${templateId}-${index}.jpg`
            : '';
        if (url) slides.push({ ...baseSlide, type: 'image', url });
        else slides.push({ ...baseSlide, type: 'text', title: 'Slide', description: '' });
      } else {
        slides.push({ ...baseSlide, type: 'text', title: 'Slide', description: '' });
      }
    });

    if (slides.length === 0) {
      slides.push({
        type: 'text',
        title: 'No content',
        description: 'Add templates in Admin.',
        duration: 10,
        transition_effect: 'fade',
        transition_duration: 300,
      });
    }

    const layout = {
      version,
      backgroundColor: '#000000',
      slides,
    };

    return NextResponse.json(
      {
        layout,
        layoutVersion: version,
        refreshIntervalSeconds: 10,
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (e) {
    console.error('[api/layout]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
