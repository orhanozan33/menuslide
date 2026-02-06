import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.from('invoice_layout').select('*').limit(1).maybeSingle();
    if (data) return NextResponse.json(data);
  } catch {
    /* fallback */
  }
  return NextResponse.json({});
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const body = await request.json();
    const { data: existing } = await supabase.from('invoice_layout').select('id').limit(1).maybeSingle();
    if (existing) await supabase.from('invoice_layout').update(body).eq('id', existing.id);
    else await supabase.from('invoice_layout').insert(body);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ message: 'Save failed' }, { status: 500 });
  }
}
