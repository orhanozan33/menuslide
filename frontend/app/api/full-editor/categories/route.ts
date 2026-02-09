import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** GET /api/full-editor/categories – Full Editor kategorileri (PosterMyWall tarzı) */
export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('full_editor_categories')
      .select('id, name, description, image_url_1, image_url_2, display_order')
      .order('display_order', { ascending: true });
    if (error) return NextResponse.json([], { status: 200 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
