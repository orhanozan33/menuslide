import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/device/heartbeat — Enterprise TV app health ping.
 * Body: { deviceToken, ramUsageMb?, playbackStatus?, appVersion?, lastError? }
 * Returns: { ok: true }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deviceToken = body?.deviceToken;
    if (!deviceToken) {
      return NextResponse.json({ ok: false, error: 'deviceToken required' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
