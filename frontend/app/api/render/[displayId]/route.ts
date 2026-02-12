import { NextRequest, NextResponse } from 'next/server';
import { captureDisplayScreenshot } from '@/lib/render-screenshot';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/render/[displayId] — App-Level Image Sync for Roku.
 * Returns a screenshot of the display page (1920x1080) as JPEG.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  const { displayId } = await params;
  if (!displayId) {
    return NextResponse.json({ error: 'displayId required' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menuslide.com';
  const displayPageUrl = `${baseUrl}/display/${encodeURIComponent(displayId)}?lite=1`;

  try {
    const bytes = await captureDisplayScreenshot(displayPageUrl);
    if (!bytes) {
      return new NextResponse(
        'Screenshot service not configured. Install puppeteer: npm i puppeteer.',
        { status: 503, headers: { 'Content-Type': 'text/plain' } }
      );
    }
    const body = new Uint8Array(bytes);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (e) {
    console.error('[api/render]', displayId, e);
    return NextResponse.json(
      { error: 'Screenshot failed', message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
