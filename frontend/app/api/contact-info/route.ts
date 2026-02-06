import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

const BACKEND_URL = (typeof process.env.NEXT_PUBLIC_API_URL === 'string' && process.env.NEXT_PUBLIC_API_URL.trim()) || '';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const emptyContact = { email: '', phone: '', address: '', whatsapp: '' };

export async function GET() {
  if (!BACKEND_URL) {
    try {
      const supabase = getServerSupabase();
      const { data } = await supabase.from('contact_info').select('*').limit(1).maybeSingle();
      if (data) return NextResponse.json({ email: data.email ?? '', phone: data.phone ?? '', address: data.address ?? '', whatsapp: data.whatsapp ?? '' });
    } catch {
      /* fallback */
    }
    return NextResponse.json(emptyContact);
  }
  try {
    const res = await fetch(`${BACKEND_URL}/contact-info`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json(emptyContact);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(emptyContact);
  }
}

export async function PUT(request: NextRequest) {
  if (!BACKEND_URL) {
    try {
      const supabase = getServerSupabase();
      const body = await request.json();
      const { data: existing } = await supabase.from('contact_info').select('id').limit(1).maybeSingle();
      if (existing) await supabase.from('contact_info').update(body).eq('id', existing.id);
      else await supabase.from('contact_info').insert(body);
      return NextResponse.json(body);
    } catch {
      return NextResponse.json({ message: 'Save failed' }, { status: 500 });
    }
  }
  try {
    const auth = request.headers.get('authorization') || '';
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/contact-info`, {
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
    console.error('[api/contact-info] PUT error:', e);
    return NextResponse.json(
      { message: "Backend bağlantı hatası. Backend çalışıyor olmalı." },
      { status: 502 }
    );
  }
}
