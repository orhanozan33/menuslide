import { NextRequest, NextResponse } from 'next/server';
import { useLocalBackend } from '@/lib/api-backend/dispatch';
import * as publicScreenHandlers from '@/lib/api-backend/handlers/public-screen';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim();

/**
 * GET /api/public-screen/:token
 * BACKEND_URL boşsa yerel handler (Supabase), doluysa backend proxy.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ screen: null, notFound: true, menus: [] }, { status: 200 });
  }

  if (useLocalBackend()) {
    return publicScreenHandlers.getScreenByToken(token, request);
  }

  const rotationIndex = new URL(request.url).searchParams.get('rotationIndex');
  const query = rotationIndex != null ? `?rotationIndex=${rotationIndex}` : '';
  const backendUrl = `${BACKEND_URL}/public/screen/${encodeURIComponent(token)}${query}`;

  try {
    const res = await fetch(backendUrl, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 404) {
      return NextResponse.json(
        { screen: null, notFound: true, menus: [], template: null, screenBlocks: [], blockContents: [] },
        { status: 200 }
      );
    }

    if (!res.ok) {
      const text = await res.text();
      let body: unknown = {};
      try {
        if (text) body = JSON.parse(text);
      } catch {
        body = { message: text };
      }
      return NextResponse.json(body, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/public-screen] proxy error:', e);
    return NextResponse.json(
      { screen: null, notFound: true, menus: [], message: 'Backend bağlantı hatası' },
      { status: 200 }
    );
  }
}
