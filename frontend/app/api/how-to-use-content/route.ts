import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/how-to-use-content`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({ texts: {}, images: {} }));
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/how-to-use-content] GET error:', e);
    return NextResponse.json({ texts: {}, images: {} }, { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || '';
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/how-to-use-content`, {
      method: 'PUT',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(auth && { Authorization: auth }),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      let errMsg = 'Save failed';
      try {
        if (text) {
          const parsed = JSON.parse(text);
          errMsg = parsed.message || parsed.error || text;
        }
      } catch {
        if (text) errMsg = text;
      }
      return NextResponse.json({ message: errMsg }, { status: res.status });
    }
    let data = body;
    try {
      if (text) data = JSON.parse(text);
    } catch {
      /* keep body */
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/how-to-use-content] PUT error:', e);
    return NextResponse.json(
      { message: "Backend bağlantı hatası. Backend'in çalıştığından emin olun." },
      { status: 502 }
    );
  }
}
