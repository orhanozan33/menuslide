import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** Slide image base: static CDN only. No server encoding. e.g. https://cdn.domain.com/slides */
const SLIDE_IMAGE_BASE =
  process.env.NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, '');

/**
 * GET /api/device/layout — JSON layout for Roku Digital Signage (slides only, no video).
 * Returns: { layout: { version, backgroundColor, slides }, layoutVersion, refreshIntervalSeconds }
 * Images are static URLs only (no server processing).
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
      .select('id, updated_at')
      .eq('id', screenId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (screenError || !screen) {
      return NextResponse.json({ error: 'invalid token' }, { status: 404 });
    }

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
    const version =
      rotationMaxUpdated && rotationMaxUpdated > screenUpdated ? rotationMaxUpdated : screenUpdated;
    const versionParam = version.replace(/[:.]/g, '-');
    const slides: Array<{ type: string; url?: string; title?: string; description?: string; duration: number; transition_effect?: string; transition_duration?: number }> = [];

    for (const r of ordered) {
      const templateId =
        (r as { full_editor_template_id?: string | null }).full_editor_template_id ||
        (r as { template_id?: string }).template_id;
      const duration = Math.max(1, (r as { display_duration?: number }).display_duration ?? 8);
      const transitionEffect = (r as { transition_effect?: string }).transition_effect ?? 'fade';
      const transitionDuration = (r as { transition_duration?: number }).transition_duration ?? 300;

      const baseSlide = { duration, transition_effect: transitionEffect, transition_duration: Math.min(2000, Math.max(100, transitionDuration)) };
      if (SLIDE_IMAGE_BASE && templateId) {
        const url = `${SLIDE_IMAGE_BASE}/slides/${screenId}/${templateId}.jpg?v=${encodeURIComponent(versionParam)}`;
        slides.push({ ...baseSlide, type: 'image', url });
      } else {
        slides.push({ ...baseSlide, type: 'text', title: 'Slide', description: '' });
      }
    }

    // No slides: one placeholder text slide so app has something to show
    if (slides.length === 0) {
      slides.push({
        type: 'text',
        title: 'No content',
        description: 'Add templates in Admin and set SLIDE_IMAGE_BASE_URL for images.',
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
        deviceToken,
        layout,
        layoutVersion: version,
        refreshIntervalSeconds: 300,
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
