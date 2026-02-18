import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getScreenTemplateRotations } from '@/lib/generate-slides-internal';

export const dynamic = 'force-dynamic';

const SLIDE_IMAGE_BASE =
  process.env.NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, '');

/**
 * GET /api/layout/{displayId} — Public layout by slug or screen id.
 * Authority: screen_template_rotations. Slide sayısı = rotation sayısı.
 * Web ve Roku aynı endpoint: versioned JPG URL'leri.
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

    const rotations = await getScreenTemplateRotations(screenId);

    const version = versionHash ?? (screen as { updated_at?: string }).updated_at ?? new Date().toISOString();

    const slides: Array<{
      type: string;
      url?: string;
      title?: string;
      description?: string;
      duration: number;
      transition_effect?: string;
      transition_duration?: number;
    }> = [];

    if (rotations.length === 0) {
      slides.push({
        type: 'text',
        title: 'No content',
        description: 'Add templates in Admin.',
        duration: 10,
        transition_effect: 'fade',
        transition_duration: 300,
      });
    } else {
      // Kullanıcı ne ayarladıysa birebir (sayıya çevir)
      const toNum = (v: unknown, fallback: number): number => {
        if (v == null) return fallback;
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
      };
      rotations.forEach((r, orderIndex) => {
        const duration = Math.max(1, Math.min(86400, toNum((r as { display_duration?: unknown }).display_duration, 5)));
        const transitionEffect = (r as { transition_effect?: string }).transition_effect ?? 'fade';
        const transitionDuration = Math.min(5000, Math.max(100, toNum((r as { transition_duration?: unknown }).transition_duration, 1400)));
        const baseSlide = {
          duration,
          transition_effect: transitionEffect,
          transition_duration: transitionDuration,
        };
        if (versionHash && SLIDE_IMAGE_BASE) {
          const t = (screen as { updated_at?: string }).updated_at ?? '';
          const url = `${SLIDE_IMAGE_BASE}/slides/${screenId}/${versionHash}/slide_${orderIndex}.jpg?t=${encodeURIComponent(t)}`;
          slides.push({ ...baseSlide, type: 'image', url });
        } else if (!versionHash && SLIDE_IMAGE_BASE) {
          const templateId = r.full_editor_template_id || r.template_id;
          const url = templateId ? `${SLIDE_IMAGE_BASE}/slides/${screenId}/${templateId}-${orderIndex}.jpg` : '';
          if (url) slides.push({ ...baseSlide, type: 'image', url });
          else slides.push({ ...baseSlide, type: 'text', title: 'Slide', description: '' });
        } else {
          slides.push({ ...baseSlide, type: 'text', title: 'Slide', description: '' });
        }
      });

      if (versionHash && slides.length !== rotations.length) {
        console.error('[api/layout] slide count !== rotation count', { displayId, slidesLength: slides.length, rotationCount: rotations.length });
      }
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
