import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { useLocalDb, queryLocal, queryOne } from '@/lib/api-backend/db-local';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /menu-resolver/business/:businessId - Public: QR sayfası için menüler (token gerekmez) */
export async function getBusinessMenus(
  businessIdOrSlug: string,
  request: NextRequest
): Promise<Response> {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') || 'en';

  try {
    let businessId = businessIdOrSlug;
    let appearance: { name: string | null; qr_background_image_url: string | null; qr_background_color: string | null } | null = null;
    let menus: Array<Record<string, unknown> & { items?: Array<Record<string, unknown>> }> = [];

    if (useLocalDb()) {
      if (!UUID_REGEX.test(businessIdOrSlug)) {
        const slugRow = await queryOne<{ id: string }>('SELECT id FROM businesses WHERE LOWER(slug) = LOWER($1) AND is_active = true', [businessIdOrSlug]);
        if (slugRow) businessId = slugRow.id;
      }
      const biz = await queryOne<{ name: string; qr_background_image_url: string | null; qr_background_color: string | null }>(
        'SELECT name, qr_background_image_url, qr_background_color FROM businesses WHERE id = $1 AND is_active = true',
        [businessId]
      );
      if (biz) {
        appearance = {
          name: biz.name?.trim() || null,
          qr_background_image_url: biz.qr_background_image_url?.trim() || null,
          qr_background_color: biz.qr_background_color?.trim() || null,
        };
      }
      const menusRows = await queryLocal<Record<string, unknown> & { id: string; name?: string; description?: string }>(
        `SELECT m.* FROM menus m
         WHERE m.business_id = $1 AND m.is_active = true
         AND (m.description IS NULL OR (
           m.description NOT LIKE 'Menu auto-created from template:%'
           AND m.description != 'Template''ten otomatik oluşturulan menü'
         ))
         AND (m.name IS NULL OR (m.name NOT ILIKE '%(kopya)%'))
         ORDER BY m.created_at DESC`,
        [businessId]
      );
      for (const menu of menusRows) {
        const itemsRows = await queryLocal<Record<string, unknown> & { page_index?: number }>(
          `SELECT mi.*, COALESCE(mit.name, mi.name) as name, COALESCE(mit.description, mi.description) as description
           FROM menu_items mi
           LEFT JOIN menu_item_translations mit ON mi.id = mit.menu_item_id AND mit.language_code = $2
           WHERE mi.menu_id = $1 AND mi.is_active = true
           ORDER BY mi.display_order ASC`,
          [menu.id, lang]
        );
        menus.push({ ...menu, items: itemsRows });
      }
    } else {
      const supabase = getServerSupabase();
      if (!UUID_REGEX.test(businessIdOrSlug)) {
        const { data: slugRow } = await supabase.from('businesses').select('id').ilike('slug', businessIdOrSlug).eq('is_active', true).maybeSingle();
        if (slugRow) businessId = (slugRow as { id: string }).id;
      }
      const { data: biz } = await supabase.from('businesses').select('name, qr_background_image_url, qr_background_color').eq('id', businessId).eq('is_active', true).maybeSingle();
      if (biz) {
        appearance = {
          name: (biz.name as string)?.trim() || null,
          qr_background_image_url: (biz.qr_background_image_url as string)?.trim() || null,
          qr_background_color: (biz.qr_background_color as string)?.trim() || null,
        };
      }
      const { data: allMenus } = await supabase.from('menus').select('*').eq('business_id', businessId).eq('is_active', true).order('created_at', { ascending: false });
      const menusRows = (allMenus || []).filter((m) => {
        const desc = (m.description as string) || '';
        const name = (m.name as string) || '';
        if (desc.startsWith('Menu auto-created from template:')) return false;
        if (desc === "Template'ten otomatik oluşturulan menü") return false;
        if (/\(kopya\)/i.test(name)) return false;
        return true;
      });
      for (const menu of menusRows || []) {
        const { data: rawItems } = await supabase.from('menu_items').select('*').eq('menu_id', menu.id).eq('is_active', true).order('display_order');
        const items: Array<Record<string, unknown>> = [];
        for (const mi of rawItems || []) {
          const { data: trans } = await supabase.from('menu_item_translations').select('name, description').eq('menu_item_id', mi.id).eq('language_code', lang).maybeSingle();
          items.push({ ...mi, name: trans?.name ?? mi.name, description: trans?.description ?? mi.description });
        }
        menus.push({ ...menu, items });
      }
    }

    if (!menus || menus.length === 0) {
      return Response.json({
        menus: [],
        business_name: appearance?.name ?? null,
        qr_background_image_url: appearance?.qr_background_image_url ?? null,
        qr_background_color: appearance?.qr_background_color ?? null,
        message: 'Bu işletme için henüz menü oluşturulmamış.',
      });
    }

    const formattedMenus = menus.map((menu) => {
      const pagesConfig = Array.isArray(menu.pages_config) ? (menu.pages_config as Array<{ name?: string; order?: number }>) : [];
      const pageNames = [...pagesConfig].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((p) => p.name || 'Sayfa');
      const items = (menu.items || []) as Array<Record<string, unknown> & { page_index?: number; name?: string; description?: string; price?: unknown }>;
      const itemsByPage = new Map<number, typeof items>();
      items.forEach((item) => {
        const pageIdx = item.page_index ?? 0;
        if (!itemsByPage.has(pageIdx)) itemsByPage.set(pageIdx, []);
        itemsByPage.get(pageIdx)!.push({
          ...item,
          display_name: item.name,
          display_description: item.description,
          display_price: item.price,
        });
      });
      const categories: Array<{ name: string; items: typeof items }> = [];
      const sortedPageIndices = Array.from(itemsByPage.keys()).sort((a, b) => a - b);
      sortedPageIndices.forEach((pageIdx) => {
        const pageName = pageNames[pageIdx] || `Sayfa ${pageIdx + 1}`;
        categories.push({ name: pageName, items: itemsByPage.get(pageIdx)! });
      });
      if (categories.length === 0 && items.length > 0) {
        categories.push({
          name: 'Menü',
          items: items.map((item) => ({ ...item, display_name: item.name, display_description: item.description, display_price: item.price })),
        });
      }
      return { id: menu.id, name: menu.name, description: menu.description, categories };
    });

    return Response.json({
      menus: formattedMenus,
      business_name: appearance?.name ?? null,
      qr_background_image_url: appearance?.qr_background_image_url ?? null,
      qr_background_color: appearance?.qr_background_color ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ message: msg }, { status: 500 });
  }
}

/** GET /menu-resolver/item/:itemId - Public */
export async function getMenuItemDetails(itemId: string, lang: string): Promise<Response> {
  try {
    if (useLocalDb()) {
      const rows = await queryLocal<Record<string, unknown> & { name?: string; description?: string; price?: unknown }>(
        `SELECT mi.*, COALESCE(mit.name, mi.name) as name, COALESCE(mit.description, mi.description) as description
         FROM menu_items mi
         LEFT JOIN menu_item_translations mit ON mi.id = mit.menu_item_id AND mit.language_code = $2
         WHERE mi.id = $1 AND mi.is_active = true`,
        [itemId, lang]
      );
      const item = rows[0];
      if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
      return Response.json({ ...item, display_name: item.name, display_description: item.description, display_price: item.price });
    }
    const supabase = getServerSupabase();
    const { data: mi } = await supabase.from('menu_items').select('*').eq('id', itemId).eq('is_active', true).maybeSingle();
    if (!mi) return Response.json({ message: 'Not found' }, { status: 404 });
    const { data: trans } = await supabase.from('menu_item_translations').select('name, description').eq('menu_item_id', itemId).eq('language_code', lang).maybeSingle();
    const name = (trans?.name as string) ?? (mi.name as string);
    const description = (trans?.description as string) ?? (mi.description as string);
    return Response.json({ ...mi, name, description, display_name: name, display_description: description, display_price: mi.price });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ message: msg }, { status: 500 });
  }
}

/** GET /menu-resolver/languages/:businessId - Public */
export async function getMenuLanguages(businessIdOrSlug: string): Promise<Response> {
  try {
    let businessId = businessIdOrSlug;
    if (useLocalDb()) {
      if (!UUID_REGEX.test(businessIdOrSlug)) {
        const slugRow = await queryOne<{ id: string }>('SELECT id FROM businesses WHERE LOWER(slug) = LOWER($1) AND is_active = true', [businessIdOrSlug]);
        if (slugRow) businessId = slugRow.id;
      }
      const rows = await queryLocal<{ code: string; name: string; is_default: boolean }>(
        `SELECT DISTINCT l.code, l.name, l.is_default
         FROM languages l
         INNER JOIN menu_item_translations mit ON l.code = mit.language_code
         INNER JOIN menu_items mi ON mit.menu_item_id = mi.id
         INNER JOIN menus m ON mi.menu_id = m.id
         WHERE m.business_id = $1 AND m.is_active = true AND mi.is_active = true AND l.is_active = true
         AND (m.description IS NULL OR (
           m.description NOT LIKE 'Menu auto-created from template:%'
           AND m.description != 'Template''ten otomatik oluşturulan menü'
         ))
         AND (m.name IS NULL OR (m.name NOT ILIKE '%(kopya)%'))
         UNION
         SELECT code, name, is_default FROM languages WHERE code = 'en' AND is_active = true
         ORDER BY code`,
        [businessId]
      );
      return Response.json(rows);
    }
    const supabase = getServerSupabase();
    if (!UUID_REGEX.test(businessIdOrSlug)) {
      const { data: slugRow } = await supabase.from('businesses').select('id').ilike('slug', businessIdOrSlug).eq('is_active', true).maybeSingle();
      if (slugRow) businessId = (slugRow as { id: string }).id;
    }
    const { data: allMenusLang } = await supabase.from('menus').select('id, name, description').eq('business_id', businessId).eq('is_active', true);
    const menus = (allMenusLang || []).filter((m) => {
      const desc = ((m as { description?: string }).description as string) || '';
      const name = ((m as { name?: string }).name as string) || '';
      if (desc.startsWith('Menu auto-created from template:')) return false;
      if (desc === "Template'ten otomatik oluşturulan menü") return false;
      if (/\(kopya\)/i.test(name)) return false;
      return true;
    });
    if (!menus || menus.length === 0) {
      const { data: en } = await supabase.from('languages').select('code, name, is_default').eq('code', 'en').eq('is_active', true).maybeSingle();
      return Response.json(en ? [en] : []);
    }
    const menuIds = menus.map((m) => m.id);
    const { data: items } = await supabase.from('menu_items').select('id').eq('is_active', true).in('menu_id', menuIds);
    if (!items || items.length === 0) {
      const { data: en } = await supabase.from('languages').select('code, name, is_default').eq('code', 'en').eq('is_active', true).maybeSingle();
      return Response.json(en ? [en] : []);
    }
    const { data: trans } = await supabase.from('menu_item_translations').select('language_code').in('menu_item_id', items.map((i) => i.id));
    const codes = Array.from(new Set((trans || []).map((t) => t.language_code)));
    if (codes.length === 0) {
      const { data: en } = await supabase.from('languages').select('code, name, is_default').eq('code', 'en').eq('is_active', true).maybeSingle();
      return Response.json(en ? [en] : []);
    }
    const { data: langs } = await supabase.from('languages').select('code, name, is_default').in('code', codes).eq('is_active', true).order('code');
    const hasEn = (langs || []).some((l) => l.code === 'en');
    if (!hasEn) {
      const { data: en } = await supabase.from('languages').select('code, name, is_default').eq('code', 'en').eq('is_active', true).maybeSingle();
      if (en) return Response.json([...(langs || []), en].sort((a, b) => (a.code < b.code ? -1 : 1)));
    }
    return Response.json(langs || []);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ message: msg }, { status: 500 });
  }
}
