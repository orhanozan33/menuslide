import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/proxy — Proxy kökü (404 yerine bilgilendirici yanıt).
 * Gerçek API çağrıları: POST /api/proxy/player/resolve, GET /api/proxy/auth/me, vb.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Menu Slide API proxy. Use specific endpoints, e.g. POST /api/proxy/player/resolve',
    endpoints: {
      'POST /api/proxy/player/resolve': 'TV app: resolve broadcast code to stream URL',
      'GET /api/proxy/public/screen/:token': 'Public screen content by token/slug',
      'GET /api/tv-app-config': 'TV app config (apiBaseUrl, downloadUrl)',
    },
  });
}
