/**
 * Slide görsellerini oluşturup Spaces'e yükler.
 * Auth gerektirmez — device/register veya generate-slides handler'dan çağrılır.
 */
import { getServerSupabase } from '@/lib/supabase-server';
import { captureDisplayScreenshot } from '@/lib/render-screenshot';
import { uploadSlideToSpaces, isSpacesConfigured, deleteSlidesNotInSet } from '@/lib/spaces-slides';

export interface GenerateSlidesResult {
  generated: number;
  deleted: number;
  errors?: string[];
}

/**
 * Ekran için slide görsellerini üretip Spaces'e yükler.
 * Yayında olan template'lerin display sayfası screenshot alınır.
 */
export async function generateSlidesForScreen(screenId: string): Promise<GenerateSlidesResult> {
  if (!isSpacesConfigured()) {
    return { generated: 0, deleted: 0, errors: ['Spaces yapılandırılmamış'] };
  }

  const supabase = getServerSupabase();

  const { data: screenRow, error: screenError } = await supabase
    .from('screens')
    .select('id, public_slug, public_token, broadcast_code')
    .eq('id', screenId)
    .single();

  if (screenError || !screenRow) {
    return { generated: 0, deleted: 0, errors: ['Ekran bulunamadı'] };
  }

  const slug =
    (screenRow as { public_slug?: string }).public_slug ||
    (screenRow as { public_token?: string }).public_token ||
    (screenRow as { broadcast_code?: string }).broadcast_code;

  if (!slug) {
    return { generated: 0, deleted: 0, errors: ['Ekran için public slug yok'] };
  }

  const { data: rotations, error: rotError } = await supabase
    .from('screen_template_rotations')
    .select('template_id, full_editor_template_id, display_order')
    .eq('screen_id', screenId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (rotError || !rotations?.length) {
    return { generated: 0, deleted: 0, errors: ['Yayında template yok'] };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menuslide.com').replace(/\/$/, '');
  const keys: string[] = [];
  const keysToKeep: string[] = [];
  const errors: string[] = [];
  const runTs = Date.now();
  console.log('[generate-slides-internal] screen=', screenId, 'slug=', slug, 'rotations=', rotations.length, 'baseUrl=', baseUrl);

  await new Promise((r) => setTimeout(r, 5000));

  for (let i = 0; i < rotations.length; i++) {
    const r = rotations[i] as { template_id?: string | null; full_editor_template_id?: string | null };
    const templateId = r.full_editor_template_id || r.template_id;
    if (!templateId) continue;

    keysToKeep.push(`${templateId}-${i}`);

    const url = `${baseUrl}/display/${encodeURIComponent(String(slug))}?lite=1&rotationIndex=${i}&_=${runTs}-${i}`;
    try {
      console.log('[generate-slides-internal] slide', i, 'capturing url=', url.slice(0, 80), '...');
      const buffer = await captureDisplayScreenshot(url);
      if (!buffer) {
        errors.push(`Slide ${i}: screenshot alınamadı`);
        console.error('[generate-slides-internal] slide', i, 'screenshot alınamadı (buffer null)');
        continue;
      }
      const key = await uploadSlideToSpaces(screenId, templateId, i, buffer);
      keys.push(key);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Slide ${i} (${templateId}): ${msg}`);
    }
  }

  let deletedCount = 0;
  try {
    deletedCount = await deleteSlidesNotInSet(screenId, keysToKeep);
  } catch (e) {
    console.error('[generate-slides-internal] cleanup failed', e);
  }

  if (keys.length > 0) {
    console.log(`[generate-slides-internal] screen=${screenId} generated=${keys.length} deleted=${deletedCount}`);
    // Layout version = max(screen.updated_at, rotations.updated_at). Bump screen so Roku heartbeat
    // sees version change and refetches layout (same slides, but ensures devices get fresh data).
    try {
      await supabase.from('screens').update({ updated_at: new Date().toISOString() }).eq('id', screenId);
    } catch (e) {
      console.error('[generate-slides-internal] bump screen updated_at failed', e);
    }
  }

  return {
    generated: keys.length,
    deleted: deletedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Ürün (menu_item) güncellendiğinde bu ürünü gösteren ekranların slide'larını yeniler.
 * Block template, Full Editor ve screen_menu ile menü atanmış tüm ekranlar kapsanır.
 */
export async function regenerateSlidesForAffectedScreens(
  menuItemId: string,
  menuId: string
): Promise<void> {
  if (!isSpacesConfigured()) return;
  const supabase = getServerSupabase();
  if (!supabase) return;
  const screenIds = new Set<string>();

  // screen_menu: Bu menüyü gösteren tüm ekranlar (tv8, tv9, tv10 vb.) — Full Editor dahil
  const { data: sm } = await supabase
    .from('screen_menu')
    .select('screen_id')
    .eq('menu_id', menuId);
  (sm || []).forEach((r: { screen_id: string }) => screenIds.add(r.screen_id));

  // template_block_contents: single_product (menu_item_id) veya product_list (menu_id)
  const { data: tbc1 } = await supabase
    .from('template_block_contents')
    .select('template_block_id')
    .eq('is_active', true)
    .eq('menu_item_id', menuItemId);
  const { data: tbc2 } = await supabase
    .from('template_block_contents')
    .select('template_block_id')
    .eq('is_active', true)
    .eq('content_type', 'product_list')
    .eq('menu_id', menuId);
  const tbc = [...(tbc1 || []), ...(tbc2 || [])];
  if (tbc.length) {
    const blockIds = [...new Set((tbc as { template_block_id: string }[]).map((x) => x.template_block_id))];
    const { data: tb } = await supabase.from('template_blocks').select('template_id').in('id', blockIds);
    const templateIds = [...new Set((tb || []).map((x: { template_id: string }) => x.template_id))];
    const { data: rotations } = await supabase
      .from('screen_template_rotations')
      .select('screen_id')
      .in('template_id', templateIds)
      .eq('is_active', true);
    (rotations || []).forEach((r: { screen_id: string }) => screenIds.add(r.screen_id));
  }

  // screen_block_contents: aynı mantık
  const { data: sbc1 } = await supabase
    .from('screen_block_contents')
    .select('screen_block_id')
    .eq('is_active', true)
    .eq('menu_item_id', menuItemId);
  const { data: sbc2 } = await supabase
    .from('screen_block_contents')
    .select('screen_block_id')
    .eq('is_active', true)
    .eq('content_type', 'product_list')
    .eq('menu_id', menuId);
  const sbc = [...(sbc1 || []), ...(sbc2 || [])];
  if (sbc.length) {
    const sbIds = [...new Set((sbc as { screen_block_id: string }[]).map((x) => x.screen_block_id))];
    const { data: sb } = await supabase.from('screen_blocks').select('screen_id').in('id', sbIds);
    (sb || []).forEach((r: { screen_id: string }) => screenIds.add(r.screen_id));
  }

  for (const screenId of screenIds) {
    try {
      const r = await generateSlidesForScreen(screenId);
      if (r.generated > 0) console.log('[regenerateSlidesForMenuItem] screen=', screenId, 'generated=', r.generated);
    } catch (e) {
      console.error('[regenerateSlidesForMenuItem] screen=', screenId, 'failed', e);
    }
  }
}
