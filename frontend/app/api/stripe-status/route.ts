import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || '';
    const res = await fetch(`${BACKEND_URL}/settings/stripe-status`, {
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
