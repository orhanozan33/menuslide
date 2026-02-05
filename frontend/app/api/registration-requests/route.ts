import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Public: Kayıt talebi oluştur */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/registration-requests`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      let errMsg = 'Request failed';
      try {
        if (text) {
          const parsed = JSON.parse(text);
          errMsg = parsed.message || parsed.error || (Array.isArray(parsed) ? parsed.map((e: any) => e?.message || e).join(', ') : text);
        }
      } catch {
        if (text) errMsg = text;
      }
      return NextResponse.json({ message: errMsg }, { status: res.status });
    }
    const data = text ? JSON.parse(text) : body;
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/registration-requests] POST error:', e);
    return NextResponse.json(
      { message: "Backend bağlantı hatası. Backend'in çalıştığından emin olun." },
      { status: 502 }
    );
  }
}

/** Admin: Başvuruları listele */
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || '';
    const res = await fetch(`${BACKEND_URL}/registration-requests`, {
      cache: 'no-store',
      headers: { ...(auth && { Authorization: auth }) },
    });
    const text = await res.text();
    if (!res.ok) {
      let errMsg = 'Fetch failed';
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
    const data = text ? JSON.parse(text) : [];
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/registration-requests] GET error:', e);
    return NextResponse.json(
      { message: "Backend bağlantı hatası." },
      { status: 502 }
    );
  }
}
