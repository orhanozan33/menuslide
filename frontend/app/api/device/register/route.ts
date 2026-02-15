import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { generateSlidesForScreen } from '@/lib/generate-slides-internal';
import { isSpacesConfigured } from '@/lib/spaces-slides';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // generate-slides ~30–60 sn sürer; Vercel timeout

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
      console.log('[device/register] CODE_NOT_FOUND displayCode=', displayCode);
      return NextResponse.json(
        { error: 'CODE_NOT_FOUND', message: 'Display code not found or screen inactive' },
        { status: 404 }
      );
    }

    const screenId = (screen as { id: string }).id;
    console.log('[device/register] screenId=', screenId, 'displayCode=', displayCode);
    const deviceToken = `dt_${screenId}_${deviceId.slice(0, 8)}_${Date.now()}`;

    const { data: rotations } = await supabase
      .from('screen_template_rotations')
      .select('template_id, full_editor_template_id, display_duration, display_order, transition_effect, transition_duration, updated_at')
      .eq('screen_id', screenId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const ordered = rotations ?? [];
    console.log('[device/register] rotations count=', ordered.length, 'screenId=', screenId);
    const rotationMaxUpdated = ordered.reduce((max, r) => {
      const u = (r as { updated_at?: string }).updated_at;
      return u && (!max || u > max) ? u : max;
    }, '' as string);
    const slides: Array<{ type: string; url?: string; title?: string; description?: string; duration: number; transition_effect?: string; transition_duration?: number }> = [];

    ordered.forEach((r, index) => {
      const templateId =
        (r as { full_editor_template_id?: string | null }).full_editor_template_id ||
        (r as { template_id?: string }).template_id;
      const duration = Math.max(1, (r as { display_duration?: number }).display_duration ?? 8);
      const transitionEffect = (r as { transition_effect?: string }).transition_effect ?? 'slide-left';
      const transitionDuration = Math.min(5000, Math.max(100, (r as { transition_duration?: number }).transition_duration ?? 5000));

      const baseSlide = { duration, transition_effect: transitionEffect, transition_duration: transitionDuration };
      if (SLIDE_IMAGE_BASE && templateId) {
        slides.push({ ...baseSlide, type: 'image', url: `${SLIDE_IMAGE_BASE}/slides/${screenId}/${templateId}-${index}.jpg` });
      } else {
        slides.push({ ...baseSlide, type: 'text', title: 'Slide', description: '' });
      }
    });

    if (slides.length === 0) {
      slides.push({ type: 'text', title: 'No content', description: 'Add templates in Admin.', duration: 10, transition_effect: 'fade', transition_duration: 400 });
    }

    const screenUpdated = (screen as { updated_at?: string }).updated_at ?? new Date().toISOString();
    const version =
      rotationMaxUpdated && rotationMaxUpdated > screenUpdated ? rotationMaxUpdated : screenUpdated;
    const versionParam = version.replace(/[:.]/g, '-');
    const layout = {
      version,
      backgroundColor: '#000000',
      slides: slides.map((s) =>
        s.url ? { ...s, url: `${s.url}?v=${encodeURIComponent(versionParam)}` } : s
      ),
    };

    // Roku/Android aktivasyonunda slide görselleri otomatik oluştur (Vercel after = waitUntil)
    const screenshotServiceUrl = process.env.SCREENSHOT_SERVICE_URL?.trim();
    const screenshotOneKey = process.env.SCREENSHOTONE_ACCESS_KEY?.trim();
    const hasScreenshotMethod = !!(screenshotServiceUrl || screenshotOneKey);
    const willGenerateSlides = ordered.length > 0 && isSpacesConfigured() && SLIDE_IMAGE_BASE && hasScreenshotMethod;
    console.log('[device/register] willGenerateSlides=', willGenerateSlides, 'SCREENSHOT_SERVICE_URL=', screenshotServiceUrl ? 'SET' : 'NOT_SET', 'SCREENSHOTONE=', !!screenshotOneKey, 'spaces=', isSpacesConfigured(), 'base=', !!SLIDE_IMAGE_BASE);
    if (willGenerateSlides) {
      after(async () => {
        console.log('[device/register] after() started, calling generateSlidesForScreen screenId=', screenId);
        try {
          const r = await generateSlidesForScreen(screenId);
          console.log('[device/register] generate-slides done screen=', screenId, 'generated=', r.generated, 'errors=', r.errors?.length ?? 0);
          if (r.generated > 0) console.log('[device/register] generate-slides OK generated=', r.generated);
          if (r.errors?.length) r.errors.forEach((err) => console.error('[device/register] generate-slides error:', err));
        } catch (e) {
          console.error('[device/register] generate-slides failed:', e);
        }
      });
    } else {
      console.log('[device/register] willGenerateSlides=false skip (rotations=', ordered.length, 'spaces=', isSpacesConfigured(), 'base=', !!SLIDE_IMAGE_BASE, ')');
    }

    return NextResponse.json(
      {
        deviceToken,
        layout,
        layoutVersion: version,
        refreshIntervalSeconds: 15,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (e) {
    console.error('[device/register]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
