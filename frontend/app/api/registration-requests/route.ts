import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.trim();
const USE_SELF = !API_BASE;
const TARGET_BASE = API_BASE || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'));
const REG_PATH = USE_SELF ? '/api/proxy/registration-requests' : '/registration-requests';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Public: Kayıt talebi oluştur */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${TARGET_BASE}${REG_PATH}`, {
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
      { message: "Backend bağlantı hatası. Backend çalışıyor olmalı." },
      { status: 502 }
    );
  }
}

/** Admin: Başvuruları listele */
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || '';
    const res = await fetch(`${TARGET_BASE}${REG_PATH}`, {
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
