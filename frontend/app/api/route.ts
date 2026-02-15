import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api — API base; confirms server is reachable (e.g. Roku, health checks).
 * Device endpoints: POST /api/device/register, GET /api/device/layout, etc.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    api: 'MenuSlide',
    device: {
      register: 'POST /api/device/register',
      layout: 'GET /api/device/layout',
      version: 'GET /api/device/version',
      heartbeat: 'POST /api/device/heartbeat',
    },
  });
}
