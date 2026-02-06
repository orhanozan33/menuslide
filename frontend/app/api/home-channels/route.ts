import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

const BACKEND_URL = (typeof process.env.NEXT_PUBLIC_API_URL === 'string' && process.env.NEXT_PUBLIC_API_URL.trim()) || '';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!BACKEND_URL) {
    try {
      const supabase = getServerSupabase();
      const { data, error } = await supabase.from('home_channels').select('*').order('display_order', { ascending: true });
      if (error) return NextResponse.json([], { status: 200 });
      return NextResponse.json(data ?? []);
    } catch {
      return NextResponse.json([], { status: 200 });
    }
  }
  try {
    const res = await fetch(`${BACKEND_URL}/home-channels`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/home-channels] GET error:', e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  if (!BACKEND_URL) {
    try {
      const supabase = getServerSupabase();
      const body = await request.json();
      if (Array.isArray(body)) {
        for (let i = 0; i < body.length; i++) {
          const row = body[i];
          if (row.id) await supabase.from('home_channels').update({ ...row, display_order: row.display_order ?? i }).eq('id', row.id);
          else await supabase.from('home_channels').insert({ ...row, display_order: row.display_order ?? i });
        }
      }
      return NextResponse.json(body);
    } catch (e) {
      return NextResponse.json({ message: 'Save failed' }, { status: 500 });
    }
  }
  try {
    const auth = request.headers.get('authorization') || '';
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/home-channels`, {
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
          errMsg = parsed.message || parsed.error || (Array.isArray(parsed) ? parsed.map((e: any) => e?.message || e).join(', ') : text);
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
    console.error('[api/home-channels] PUT error:', e);
    return NextResponse.json(
      { message: 'Backend bağlantı hatası. Backend çalışıyor olmalı.' },
      { status: 502 }
    );
  }
}
