import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// Tek cihaz modunda: 30 sn heartbeat gelmeyen oturum silinir; böylece diğer açık cihaz ~30 sn içinde yayına devam eder
const VIEWER_STALE_MS = 30 * 1000; // 30 sn

/** GET public/screen/:token – TV yayını verisi (Supabase) */
export async function getScreenByToken(token: string, request: NextRequest): Promise<Response> {
  const supabase = getServerSupabase();
  // rotationIndex: önce query (Vercel'de bazen strip'lenebilir), yoksa header (display snapshot'tan)
  const searchParams = request.nextUrl?.searchParams ?? new URL(request.url).searchParams;
  const rotationIndexParam = searchParams.get('rotationIndex');
  const headerRotation = request.headers.get('X-Snapshot-Rotation');
  const fromQuery = rotationIndexParam != null && rotationIndexParam !== '' ? parseInt(rotationIndexParam, 10) : NaN;
  const fromHeader = headerRotation != null && headerRotation !== '' ? parseInt(headerRotation, 10) : NaN;
  const templateRotationIndex = Number.isFinite(fromQuery) ? fromQuery : (Number.isFinite(fromHeader) ? fromHeader : undefined);

  // 1) Screen by public_slug or public_token (business must be active)
  const { data: screensBySlug } = await supabase
    .from('screens')
    .select('id, name, location, business_id, animation_type, animation_duration, language_code, font_family, primary_color, background_style, background_color, background_image_url, logo_url, template_id, frame_type, ticker_text, ticker_style')
    .eq('public_slug', token)
    .eq('is_active', true)
    .limit(1);

  let screenRow: Record<string, unknown> | null = null;
  if (screensBySlug?.length) {
    const sid = screensBySlug[0].id;
    const { data: biz } = await supabase.from('businesses').select('id, name').eq('id', screensBySlug[0].business_id).eq('is_active', true).single();
    if (biz) screenRow = { ...screensBySlug[0], business_name: biz.name };
  }
  if (!screenRow) {
    const { data: screensByToken } = await supabase
      .from('screens')
      .select('id, name, location, business_id, animation_type, animation_duration, language_code, font_family, primary_color, background_style, background_color, background_image_url, logo_url, template_id, frame_type, ticker_text, ticker_style')
      .eq('public_token', token)
      .eq('is_active', true)
      .limit(1);
    if (screensByToken?.length) {
      const { data: biz } = await supabase.from('businesses').select('id, name').eq('id', screensByToken[0].business_id).eq('is_active', true).single();
      if (biz) screenRow = { ...screensByToken[0], business_name: biz.name };
    }
  }
  // 3) Yayın kodu (broadcast_code) ile de ara — /display/10012 gibi link TV’deki kodla aynı olsun
  if (!screenRow) {
    const { data: screensByCode } = await supabase
      .from('screens')
      .select('id, name, location, business_id, animation_type, animation_duration, language_code, font_family, primary_color, background_style, background_color, background_image_url, logo_url, template_id, frame_type, ticker_text, ticker_style')
      .eq('broadcast_code', token)
      .eq('is_active', true)
      .limit(1);
    if (screensByCode?.length) {
      const { data: biz } = await supabase.from('businesses').select('id, name').eq('id', screensByCode[0].business_id).eq('is_active', true).single();
      if (biz) screenRow = { ...screensByCode[0], business_name: biz.name };
    }
  }

  if (!screenRow) {
    return Response.json({
      screen: null,
      notFound: true,
      menus: [],
      template: null,
      screenBlocks: [],
      blockContents: [],
    });
  }

  const screenId = screenRow.id as string;
  const languageCode = (screenRow.language_code as string) || 'en';

  // 2) Active menu (RPC or fallback screen_menu)
  let activeMenuId: string | null = null;
  try {
    const { data: menuId } = await supabase.rpc('get_active_menu_for_screen', { p_screen_id: screenId });
    activeMenuId = menuId ?? null;
  } catch {
    const { data: sm } = await supabase.from('screen_menu').select('menu_id').eq('screen_id', screenId).order('display_order', { ascending: true }).limit(1).maybeSingle();
    activeMenuId = sm?.menu_id ?? null;
  }

  let activeMenu: Record<string, unknown> | null = null;
  if (activeMenuId) {
    const { data: menu } = await supabase.from('menus').select('id, name, description, slide_duration').eq('id', activeMenuId).eq('is_active', true).single();
    if (menu) {
      const { data: items } = await supabase.from('menu_items').select('*').eq('menu_id', activeMenuId).eq('is_active', true).order('display_order', { ascending: true });
      const itemIds = (items || []).map((i: { id: string }) => i.id);
      let translations: { menu_item_id: string; name?: string; description?: string }[] = [];
      if (itemIds.length) {
        const { data: tr } = await supabase.from('menu_item_translations').select('menu_item_id, name, description').in('menu_item_id', itemIds).eq('language_code', languageCode);
        translations = tr || [];
      }
      const byId = Object.fromEntries(translations.map((t) => [t.menu_item_id, t]));
      const itemsWithTr = (items || []).map((i: Record<string, unknown> & { id: string }) => ({
        ...i,
        name: byId[i.id]?.name ?? i.name,
        description: byId[i.id]?.description ?? i.description,
      }));
      activeMenu = { ...menu, items: itemsWithTr };
    }
  }

  const { data: schedules } = await supabase.from('menu_schedules').select('menu_id, start_time, end_time, day_of_week').eq('screen_id', screenId).eq('is_active', true);

  // 3) Template rotations (template_id veya full_editor_template_id)
  const { data: rotations } = await supabase
    .from('screen_template_rotations')
    .select('template_id, full_editor_template_id, template_type, display_duration, display_order, transition_effect, transition_duration')
    .eq('screen_id', screenId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const templateRotations = (rotations || []).map((r: { template_id?: string | null; full_editor_template_id?: string | null; template_type?: string; display_duration?: number; display_order?: number; transition_effect?: string; transition_duration?: number }) => ({
    template_id: r.template_id,
    full_editor_template_id: r.full_editor_template_id,
    template_type: r.template_type,
    display_duration: r.display_duration,
    display_order: r.display_order,
    transition_effect: r.transition_effect ?? 'fade',
    transition_duration: r.transition_duration ?? 1400,
    template_name: null,
    block_count: null,
  }));

  let currentTemplateId = screenRow.template_id as string | null;
  let currentFullEditorId: string | null = null;
  let template: Record<string, unknown> | null = null;
  let screenBlocks: Record<string, unknown>[] = [];
  let blockContents: Record<string, unknown>[] = [];

  if (templateRotations.length > 0) {
    const idx = templateRotationIndex !== undefined && templateRotationIndex >= 0 && templateRotationIndex < templateRotations.length ? templateRotationIndex : 0;
    const rot = templateRotations[idx] as { template_id?: string | null; full_editor_template_id?: string | null; template_type?: string };
    currentTemplateId = rot.template_id ?? null;
    currentFullEditorId = rot.full_editor_template_id ?? null;
    if (templateRotationIndex !== undefined && templateRotationIndex >= 0) {
      const tid = currentFullEditorId || currentTemplateId || '';
      console.log('[public-screen] rotationIndex=%s templateId=%s', templateRotationIndex, tid);
    }
  }

  // Full Editor rotation
  if (currentFullEditorId) {
    const { data: feRow } = await supabase.from('full_editor_templates').select('id, name, canvas_json').eq('id', currentFullEditorId).single();
    if (feRow) {
      template = {
        id: feRow.id,
        name: feRow.name,
        template_type: 'full_editor',
        canvas_json: feRow.canvas_json ?? {},
      } as Record<string, unknown>;
      screenBlocks = [];
      blockContents = [];
    }
  }
  if (!template && currentTemplateId) {
    const { data: tRow } = await supabase.from('templates').select('*').eq('id', currentTemplateId).single();
    if (tRow) {
      template = tRow as Record<string, unknown>;
      const { data: tBlocks } = await supabase.from('template_blocks').select('*').eq('template_id', currentTemplateId).order('block_index', { ascending: true });
      const blocks = (tBlocks || []) as Record<string, unknown>[];

      if (templateRotations.length > 0) {
        const n = blocks.length;
        const cols = n <= 0 ? 2 : Math.ceil(Math.sqrt(n * 16 / 9));
        const rows = n <= 0 ? 2 : Math.ceil(n / cols);
        const cellW = cols > 0 ? 100 / cols : 50;
        const cellH = rows > 0 ? 100 / rows : 50;
        screenBlocks = blocks.map((tb: Record<string, unknown>, i: number) => {
          const px = tb.position_x != null && Number(tb.position_x) >= 0 ? tb.position_x : (i % cols) * cellW;
          const py = tb.position_y != null && Number(tb.position_y) >= 0 ? tb.position_y : Math.floor(i / cols) * cellH;
          const w = tb.width != null && Number(tb.width) > 0 ? tb.width : cellW;
          const h = tb.height != null && Number(tb.height) > 0 ? tb.height : cellH;
          return {
            id: tb.id,
            template_block_id: tb.id,
            block_index: tb.block_index,
            position_x: px,
            position_y: py,
            width: w,
            height: h,
            z_index: 0,
            animation_type: 'fade',
            animation_duration: 500,
            animation_delay: 0,
          };
        });
        const blockIds = blocks.map((b) => b.id);
        if (blockIds.length) {
          const { data: tbc } = await supabase.from('template_block_contents').select('*').in('template_block_id', blockIds).eq('is_active', true).order('display_order', { ascending: true });
          blockContents = ((tbc || []) as Record<string, unknown>[]).map((c) => ({
            ...c,
            screen_block_id: c.template_block_id,
          }));
          await attachMenuItemsToContents(supabase, blockContents, activeMenuId, languageCode, screenRow.business_id as string, template);
        }
      } else {
        const { data: sbRows } = await supabase.from('screen_blocks').select('*, template_blocks(block_index, position_x, position_y, width, height)').eq('screen_id', screenId).eq('is_active', true).order('z_index', { ascending: true });
        const sbList = (sbRows || []) as Record<string, unknown>[];
        const nSb = sbList.length;
        const colsSb = nSb <= 0 ? 2 : Math.ceil(Math.sqrt(nSb * 16 / 9));
        const rowsSb = nSb <= 0 ? 2 : Math.ceil(nSb / colsSb);
        const cellWSb = colsSb > 0 ? 100 / colsSb : 50;
        const cellHSb = rowsSb > 0 ? 100 / rowsSb : 50;
        screenBlocks = sbList.map((sb: Record<string, unknown>, i: number) => {
          const tb = (sb as { template_blocks?: Record<string, unknown> }).template_blocks;
          const rawPx = tb?.position_x ?? sb.position_x;
          const rawPy = tb?.position_y ?? sb.position_y;
          const rawW = tb?.width ?? sb.width;
          const rawH = tb?.height ?? sb.height;
          const position_x = rawPx != null && Number(rawPx) >= 0 ? rawPx : (i % colsSb) * cellWSb;
          const position_y = rawPy != null && Number(rawPy) >= 0 ? rawPy : Math.floor(i / colsSb) * cellHSb;
          const width = rawW != null && Number(rawW) > 0 ? rawW : cellWSb;
          const height = rawH != null && Number(rawH) > 0 ? rawH : cellHSb;
          return {
            id: sb.id,
            template_block_id: (sb as { template_block_id?: string }).template_block_id,
            block_index: tb?.block_index ?? sb.block_index,
            position_x,
            position_y,
            width,
            height,
            z_index: (sb as { z_index?: number }).z_index ?? 0,
            animation_type: (sb as { animation_type?: string }).animation_type ?? 'fade',
            animation_duration: (sb as { animation_duration?: number }).animation_duration ?? 500,
            animation_delay: (sb as { animation_delay?: number }).animation_delay ?? 0,
          };
        });
        const sBlockIds = screenBlocks.map((b) => b.id);
        if (sBlockIds.length) {
          const { data: sbc } = await supabase.from('screen_block_contents').select('*').in('screen_block_id', sBlockIds).eq('is_active', true).order('display_order', { ascending: true });
          blockContents = (sbc || []) as Record<string, unknown>[];
          if (blockContents.length === 0) {
            const tbIds = screenBlocks.map((b) => b.template_block_id).filter(Boolean) as string[];
            if (tbIds.length) {
              const { data: tbc } = await supabase.from('template_block_contents').select('*').in('template_block_id', tbIds).eq('is_active', true).order('display_order', { ascending: true });
              const tbToSb = Object.fromEntries(screenBlocks.map((b) => [b.template_block_id, b.id]));
              blockContents = ((tbc || []) as Record<string, unknown>[]).map((c) => ({
                ...c,
                screen_block_id: tbToSb[(c as { template_block_id: string }).template_block_id] ?? (c as { template_block_id: string }).template_block_id,
              }));
            }
          }
          await attachMenuItemsToContents(supabase, blockContents, activeMenuId, languageCode, screenRow.business_id as string, template);
        }
      }
    }
  }

  const screenPayload = {
    id: screenRow.id,
    name: screenRow.name,
    location: screenRow.location,
    animation_type: screenRow.animation_type || 'fade',
    animation_duration: screenRow.animation_duration ?? 500,
    language_code: languageCode,
    font_family: screenRow.font_family || 'system-ui',
    primary_color: screenRow.primary_color || '#fbbf24',
    background_style: screenRow.background_style || 'gradient',
    background_color: screenRow.background_color || '#0f172a',
    background_image_url: screenRow.background_image_url ?? null,
    logo_url: screenRow.logo_url ?? null,
    template_id: currentTemplateId,
    business_name: screenRow.business_name ?? null,
    frame_type: screenRow.frame_type != null ? screenRow.frame_type : 'none',
    ticker_text: screenRow.ticker_text != null ? screenRow.ticker_text : '',
    ticker_style: screenRow.ticker_style || 'default',
  };

  return Response.json(
    {
      screen: screenPayload,
      menus: activeMenu ? [activeMenu] : [],
      schedules: schedules || [],
      template,
      screenBlocks,
      blockContents,
      templateRotations: templateRotations.length ? templateRotations : undefined,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    }
  );
}

async function attachMenuItemsToContents(
  supabase: ReturnType<typeof getServerSupabase>,
  blockContents: Record<string, unknown>[],
  activeMenuId: string | null,
  languageCode: string,
  businessId: string,
  template: Record<string, unknown> | null
): Promise<void> {
  const singleIds = blockContents
    .filter((c) => (c as { content_type?: string }).content_type === 'single_product' && (c as { menu_item_id?: string }).menu_item_id)
    .map((c) => (c as { menu_item_id: string }).menu_item_id);
  if (singleIds.length) {
    const { data: items } = await supabase.from('menu_items').select('*').in('id', singleIds).eq('is_active', true);
    const { data: tr } = await supabase.from('menu_item_translations').select('menu_item_id, name, description').in('menu_item_id', singleIds).eq('language_code', languageCode);
    const byId = Object.fromEntries((items || []).map((i: { id: string } & Record<string, unknown>) => [i.id, i]));
    const trById = Object.fromEntries((tr || []).map((t: { menu_item_id: string; name?: string; description?: string }) => [t.menu_item_id, t]));
    for (const c of blockContents) {
      if ((c as { content_type?: string }).content_type === 'single_product' && (c as { menu_item_id?: string }).menu_item_id) {
        const item = byId[(c as { menu_item_id: string }).menu_item_id];
        const t = trById[(c as { menu_item_id: string }).menu_item_id];
        if (item) (c as Record<string, unknown>).menu_item = { ...item, name: t?.name ?? item.name, description: t?.description ?? item.description };
      }
    }
  }
  const productListContents = blockContents.filter((c) => (c as { content_type?: string }).content_type === 'product_list');
  if (productListContents.length === 0) return;
  let fallbackMenuId: string | null | undefined = undefined;
  const menuIds = new Set<string>();
  for (const c of productListContents) {
    let mid = (c as { menu_id?: string }).menu_id || activeMenuId;
    if (!mid && template && businessId) {
      if (fallbackMenuId === undefined) {
        const { data: fm } = await supabase.from('menus').select('id').eq('business_id', businessId).eq('is_active', true).limit(1).maybeSingle();
        fallbackMenuId = fm?.id ?? null;
      }
      mid = fallbackMenuId ?? null;
    }
    if (mid) menuIds.add(mid);
  }
  if (menuIds.size === 0) return;
  const { data: listItems } = await supabase.from('menu_items').select('*').in('menu_id', Array.from(menuIds)).eq('is_active', true).order('display_order', { ascending: true });
  const { data: listTr } = await supabase.from('menu_item_translations').select('menu_item_id, name, description').in('menu_item_id', (listItems || []).map((i: { id: string }) => i.id)).eq('language_code', languageCode);
  const byMenuId: Record<string, unknown[]> = {};
  for (const i of listItems || []) {
    const row = i as { menu_id: string } & Record<string, unknown>;
    const t = (listTr || []).find((x: { menu_item_id: string }) => x.menu_item_id === row.id);
    const list = byMenuId[row.menu_id] || [];
    list.push({ ...row, name: t?.name ?? row.name, description: t?.description ?? row.description });
    byMenuId[row.menu_id] = list;
  }
  for (const c of productListContents) {
    let mid: string | null = (c as { menu_id?: string }).menu_id || activeMenuId;
    if (!mid && template && businessId) mid = fallbackMenuId ?? null;
    (c as Record<string, unknown>).menu_items = mid ? (byMenuId[mid] || []) : [];
  }
}

/** POST public/screen/:token/heartbeat – display viewer heartbeat (Supabase) */
export async function recordViewerHeartbeat(token: string, request: NextRequest): Promise<Response> {
  const supabase = getServerSupabase();
  let sessionId = '';
  try {
    const body = await request.json();
    sessionId = (body?.sessionId && String(body.sessionId).trim()) || `anon-${Date.now()}`;
  } catch {
    sessionId = `anon-${Date.now()}`;
  }
  if (sessionId.length > 64) sessionId = sessionId.slice(0, 64);

  const { data: bySlug } = await supabase.from('screens').select('id, allow_multi_device, business_id').eq('public_slug', token).eq('is_active', true).limit(1).maybeSingle();
  let screenRow = bySlug;
  if (!screenRow) {
    const { data: byToken } = await supabase.from('screens').select('id, allow_multi_device, business_id').eq('public_token', token).eq('is_active', true).limit(1).maybeSingle();
    screenRow = byToken;
  }
  if (!screenRow) {
    const { data: byCode } = await supabase.from('screens').select('id, allow_multi_device, business_id').eq('broadcast_code', token).eq('is_active', true).limit(1).maybeSingle();
    screenRow = byCode;
  }
  const screenId = screenRow?.id ?? null;
  if (!screenId) return Response.json({ ok: false, allowed: false });

  let allowMultiDevice = !!(screenRow as { allow_multi_device?: boolean })?.allow_multi_device;
  // sistemtv@gmail.com kullanıcısının işletmesine ait ekranlarda tek cihaz kısıtlaması yok — sadece bu kullanıcı için geçerli
  if (!allowMultiDevice && screenRow?.business_id) {
    const { data: sistemTvUser } = await supabase
      .from('users')
      .select('business_id')
      .ilike('email', 'sistemtv@gmail.com')
      .limit(1)
      .maybeSingle();
    if (sistemTvUser && (sistemTvUser as { business_id?: string }).business_id === screenRow.business_id) {
      allowMultiDevice = true;
    }
  }
  if (allowMultiDevice) return Response.json({ ok: true, allowed: true });

  const now = new Date().toISOString();
  const stale = new Date(Date.now() - VIEWER_STALE_MS).toISOString();

  const { data: existing } = await supabase.from('display_viewers').select('first_seen_at').eq('screen_id', screenId).eq('session_id', sessionId).maybeSingle();
  if (existing) {
    await supabase.from('display_viewers').update({ last_seen_at: now }).eq('screen_id', screenId).eq('session_id', sessionId);
  } else {
    await supabase.from('display_viewers').insert({ screen_id: screenId, session_id: sessionId, last_seen_at: now, first_seen_at: now });
  }
  await supabase.from('display_viewers').delete().lt('last_seen_at', stale);

  const { data: viewers } = await supabase
    .from('display_viewers')
    .select('session_id, first_seen_at')
    .eq('screen_id', screenId)
    .gt('last_seen_at', stale);
  const list = (viewers || []) as { session_id: string; first_seen_at: string }[];
  const current = list.find((v) => v.session_id === sessionId);
  const firstSeenTs = current ? new Date(current.first_seen_at).getTime() : null;
  const minFirstTs = list.length ? Math.min(...list.map((v) => new Date(v.first_seen_at).getTime())) : null;
  const allowed = firstSeenTs != null && minFirstTs != null && firstSeenTs === minFirstTs;

  return Response.json({ ok: true, allowed });
}

/** GET /player/check – Tarayıcıdan: broadcast_code yapılandırması var mı? (hata ayıklama) */
export async function checkPlayerConfig(): Promise<Response> {
  try {
    const supabase = getServerSupabase();
    const { count, error } = await supabase
      .from('screens')
      .select('*', { count: 'exact', head: true })
      .not('broadcast_code', 'is', null);
    if (error) {
      const hint =
        error.message?.includes('broadcast_code') || (error as { code?: string }).code === '42703'
          ? "broadcast_code sütunu yok. Supabase SQL Editor'da database/migration-supabase-tv-app.sql çalıştırın."
          : error.message;
      return Response.json({ configured: false, hint });
    }
    return Response.json({ configured: true, screensWithCode: count ?? 0 });
  } catch (e) {
    return Response.json({ configured: false, hint: (e as Error).message });
  }
}

/** POST /player/resolve – TV uygulaması: yayın kodu ile display URL döner. Body: { code, deviceId } */
export async function resolvePlayer(request: NextRequest): Promise<Response> {
  let body: { code?: string | number; deviceId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'INVALID_JSON' }, { status: 400 });
  }
  const code = String(body?.code ?? '').trim();
  if (!code) return Response.json({ error: 'CODE_REQUIRED' }, { status: 400 });

  const supabase = getServerSupabase();
  const { data: screen, error: sbError } = await supabase
    .from('screens')
    .select('id, public_slug, public_token, is_active')
    .eq('broadcast_code', code)
    .limit(1)
    .maybeSingle();

  if (sbError) {
    console.error('[player/resolve] Supabase error:', sbError.message);
    return Response.json(
      {
        error: 'CONFIG_ERROR',
        message: 'broadcast_code sütunu veya ekran tablosu eksik. Supabase SQL Editor\'da database/migration-tv-app-required.sql dosyasını çalıştırın.',
      },
      { status: 503 }
    );
  }
  if (!screen) {
    return Response.json({
      error: 'CODE_NOT_FOUND',
      message: 'Bu kod ile eşleşen ekran yok. Admin panel → Ekranlar sayfasındaki 5 haneli kodu aynen girin.',
    });
  }
  const scr = screen as { is_active?: boolean; public_slug?: string; public_token?: string };
  if (scr.is_active === false) {
    return Response.json({
      error: 'CODE_INACTIVE',
      message: 'Bu ekran şu an pasif. Admin panel → Ekranlar\'da ilgili TV\'yi Aktif yapın.',
    });
  }
  const slugOrToken = scr.public_slug || scr.public_token;
  if (!slugOrToken) {
    return Response.json({ error: 'SCREEN_NO_URL', message: 'Ekran için yayın adresi tanımlı değil.' });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || request.nextUrl?.origin || 'http://localhost:3000';
  const streamUrl = `${baseUrl.replace(/\/$/, '')}/display/${slugOrToken}`;
  return Response.json({ streamUrl });
}
