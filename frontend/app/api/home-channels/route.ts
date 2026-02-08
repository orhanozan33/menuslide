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
    const channels = Array.isArray(body) ? body : (body?.channels && Array.isArray(body.channels) ? body.channels : []);
    for (let i = 0; i < channels.length; i++) {
      const row = channels[i];
      const { id, ...rest } = row;
      const payload = { ...rest, display_order: row.display_order ?? i };
      if (id) {
        await supabase.from('home_channels').update(payload).eq('id', id);
      } else {
        await supabase.from('home_channels').insert(payload);
      }
    }
    const { data } = await supabase.from('home_channels').select('*').order('display_order', { ascending: true });
    return NextResponse.json(data ?? channels);
  } catch (e) {
    return NextResponse.json({ message: 'Save failed' }, { status: 500 });
  }
}
