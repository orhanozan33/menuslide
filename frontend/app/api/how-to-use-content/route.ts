import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const emptyContent = { texts: {}, images: {} };

export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.from('how_to_use_content').select('*').limit(1).maybeSingle();
    if (data) return NextResponse.json({ texts: data.texts ?? {}, images: data.images ?? {} });
  } catch {
    /* fallback */
  }
  return NextResponse.json(emptyContent);
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const body = await request.json();
    const { data: existing } = await supabase.from('how_to_use_content').select('id').limit(1).maybeSingle();
    if (existing) await supabase.from('how_to_use_content').update(body).eq('id', existing.id);
    else await supabase.from('how_to_use_content').insert(body);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ message: 'Save failed' }, { status: 500 });
  }
}
