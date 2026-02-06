import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase.from('home_channels').select('*').order('display_order', { ascending: true });
    if (error) return NextResponse.json([], { status: 200 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
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
