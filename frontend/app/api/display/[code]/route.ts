import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Native TV app: GET /api/display/[code] – returns JSON layout (no WebView). Code = broadcast_code. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const cleanCode = (code || '').trim();
  if (!cleanCode) {
    return Response.json({ error: 'CODE_REQUIRED' }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data: screen, error: screenError } = await supabase
    .from('screens')
    .select('id, name, background_color, primary_color, business_id, is_active')
    .eq('broadcast_code', cleanCode)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (screenError || !screen) {
    return Response.json({ error: 'CODE_NOT_FOUND', message: 'Display code not found or inactive.' }, { status: 404 });
  }

  const screenId = screen.id as string;
  const bgColor = (screen.background_color as string) || '#000000';
  const primaryColor = (screen.primary_color as string) || '#ffffff';

  // Active menu for this screen
  let menuId: string | null = null;
  try {
    const { data: menuIdData } = await supabase.rpc('get_active_menu_for_screen', { p_screen_id: screenId });
    menuId = menuIdData ?? null;
  } catch {
    const { data: sm } = await supabase
      .from('screen_menu')
      .select('menu_id')
      .eq('screen_id', screenId)
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    menuId = (sm as { menu_id?: string } | null)?.menu_id ?? null;
  }

  const sections: Array<{
    type: string;
    url?: string;
    value?: string;
    currency?: string;
    fontSize?: number;
    color?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
  }> = [];

  if (menuId) {
    const { data: items } = await supabase
      .from('menu_items')
      .select('id, name, price, display_order')
      .eq('menu_id', menuId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(20);

    const itemIds = (items || []).map((i: { id: string }) => i.id);
    let translations: { menu_item_id: string; name?: string }[] = [];
    if (itemIds.length) {
      const { data: tr } = await supabase
        .from('menu_item_translations')
        .select('menu_item_id, name')
        .in('menu_item_id', itemIds)
        .eq('language_code', 'en');
      translations = tr || [];
    }
    const nameById = Object.fromEntries(translations.map((t) => [t.menu_item_id, t.name ?? '']));

    const screenName = (screen.name as string) || 'Menu';
    sections.push({
      type: 'text',
      value: screenName,
      fontSize: 48,
      color: primaryColor,
      x: 100,
      y: 80,
    });

    (items || []).forEach((item: { id: string; name?: string; price?: string | number; display_order?: number }, index: number) => {
      const name = nameById[item.id] || (item.name as string) || 'Item';
      const y = 180 + index * 52;
      sections.push({
        type: 'text',
        value: name,
        fontSize: 36,
        color: '#ffffff',
        x: 100,
        y,
      });
      const price = item.price != null ? String(item.price) : '';
      if (price) {
        sections.push({
          type: 'price',
          value: price,
          currency: '€',
          fontSize: 32,
          color: '#00ff00',
          x: 1600,
          y,
        });
      }
    });
  } else {
    sections.push({
      type: 'text',
      value: (screen.name as string) || 'Digital Signage',
      fontSize: 48,
      color: primaryColor,
      x: 100,
      y: 400,
    });
    sections.push({
      type: 'text',
      value: 'No menu assigned',
      fontSize: 28,
      color: '#888888',
      x: 100,
      y: 480,
    });
  }

  const layout = {
    background: bgColor,
    sections,
    refreshInterval: 60,
  };

  return Response.json(layout);
}
