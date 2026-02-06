import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const emptyContact = { email: '', phone: '', address: '', whatsapp: '' };

export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.from('contact_info').select('*').limit(1).maybeSingle();
    if (data) return NextResponse.json({ email: data.email ?? '', phone: data.phone ?? '', address: data.address ?? '', whatsapp: data.whatsapp ?? '' });
  } catch {
    /* fallback */
  }
  return NextResponse.json(emptyContact);
}

export async function PUT(request: NextRequest) {
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
