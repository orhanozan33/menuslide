import { NextRequest, NextResponse } from 'next/server';

const TARGET_BASE = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000');
const STRIPE_PATH = '/api/proxy/settings/stripe-status';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || '';
    const res = await fetch(`${TARGET_BASE}${STRIPE_PATH}`, {
      cache: 'no-store',
      headers: {
        ...(auth && { Authorization: auth }),
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { configured: false, hasPublishableKey: false, hasWebhookSecret: false },
        { status: 200 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/stripe-status] GET error:', e);
    return NextResponse.json(
      { configured: false, hasPublishableKey: false, hasWebhookSecret: false },
      { status: 200 }
    );
  }
}
