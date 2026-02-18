import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getScreenTemplateRotations } from '@/lib/generate-slides-internal';

export const dynamic = 'force-dynamic';

const SLIDE_IMAGE_BASE =
  process.env.NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, '');

/**
 * GET /api/device/layout — JSON layout for Roku (slides only). Authority: screen_template_rotations.
 */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'SERVER_NOT_CONFIGURED' }, { status: 503 });
    }

    const deviceToken =
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
    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .select('id, updated_at, layout_snapshot_version')
      .eq('id', screenId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (screenError || !screen) {
      return NextResponse.json({ error: 'invalid token' }, { status: 404 });
    }

    const versionHash = (screen as { layout_snapshot_version?: string | null }).layout_snapshot_version;
    const updatedAt = (screen as { updated_at?: string }).updated_at ?? new Date().toISOString();
    // Use layout_snapshot_version when present so Roku sees new slides; fallback to updated_at
    const version = (versionHash && String(versionHash).trim()) ? String(versionHash) : updatedAt;
    const rotations = await getScreenTemplateRotations(screenId);

    const slides: Array<{ type: string; url?: string; title?: string; description?: string; duration: number; transition_effect?: string; transition_duration?: number }> = [];

    if (rotations.length === 0) {
      slides.push({
        type: 'text',
        title: 'No content',
        description: 'Add templates in Admin and set SLIDE_IMAGE_BASE_URL for images.',
        duration: 10,
        transition_effect: 'fade',
        transition_duration: 300,
      });
    } else {
      // Web public-screen ile aynı: kullanıcı ne ayarladıysa birebir (sayıya çevir; Supabase bazen string döner)
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
        const baseSlide = { duration, transition_effect: transitionEffect, transition_duration: transitionDuration };
        if (versionHash && SLIDE_IMAGE_BASE) {
          const t = encodeURIComponent(updatedAt);
          const url = `${SLIDE_IMAGE_BASE}/slides/${screenId}/${versionHash}/slide_${orderIndex}.jpg?t=${t}`;
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
    }

    const layout = {
      version,
      backgroundColor: '#000000',
      slides,
    };

    return NextResponse.json(
      {
        deviceToken,
        layout,
        layoutVersion: version,
        refreshIntervalSeconds: 5,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (e) {
    console.error('[device/layout]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
