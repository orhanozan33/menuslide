/**
 * Slide görsellerini oluşturup Spaces'e yükler.
 * Tek render authority: sadece publish anında snapshot; versioned path slides/{screenId}/{versionHash}/slide_X.jpg
 */
import { createHash } from 'crypto';
import { getServerSupabase } from '@/lib/supabase-server';
import { captureDisplayScreenshot } from '@/lib/render-screenshot';
import {
  isSpacesConfigured,
  uploadSlideVersioned,
  uploadLayoutSnapshotJson,
  deleteSlidesExceptVersion,
} from '@/lib/spaces-slides';

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
    .select('template_id, full_editor_template_id, display_order, display_duration, transition_effect, transition_duration')
    .eq('screen_id', screenId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (rotError || !rotations?.length) {
    return { generated: 0, deleted: 0, errors: ['Yayında template yok'] };
  }

  const layoutData = JSON.stringify(
    rotations.map((r) => ({
      t: (r as { template_id?: string | null }).template_id,
      f: (r as { full_editor_template_id?: string | null }).full_editor_template_id,
      o: (r as { display_order?: number }).display_order,
    }))
  );
  const versionHash = createHash('sha256').update(layoutData).digest('hex').slice(0, 16);

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menuslide.com').replace(/\/$/, '');
  const errors: string[] = [];
  const runTs = Date.now();
  let generatedCount = 0;
  console.log('[generate-slides-internal] screen=', screenId, 'slug=', slug, 'rotations=', rotations.length, 'versionHash=', versionHash);

  await new Promise((r) => setTimeout(r, 2000));

  for (let i = 0; i < rotations.length; i++) {
    const r = rotations[i] as { template_id?: string | null; full_editor_template_id?: string | null };
    const templateId = r.full_editor_template_id || r.template_id;
    if (!templateId) continue;

    const url = `${baseUrl}/display/${encodeURIComponent(String(slug))}?lite=1&mode=snapshot&rotationIndex=${i}&_=${runTs}-${i}`;
    try {
      console.log('[generate-slides-internal] slide', i, 'capturing...');
      const buffer = await captureDisplayScreenshot(url);
      if (!buffer) {
        errors.push(`Slide ${i}: screenshot alınamadı`);
        continue;
      }
      await uploadSlideVersioned(screenId, versionHash, i, buffer);
      generatedCount += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Slide ${i} (${templateId}): ${msg}`);
    }
  }

  if (generatedCount === 0) {
    return {
      generated: 0,
      deleted: 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  const SLIDE_IMAGE_BASE =
    process.env.NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, '');
  const slides = rotations.map((r, index) => {
    const duration = Math.max(1, (r as { display_duration?: number }).display_duration ?? 8);
    const transitionEffect = (r as { transition_effect?: string }).transition_effect ?? 'slide-left';
    const transitionDuration = Math.min(5000, Math.max(100, (r as { transition_duration?: number }).transition_duration ?? 5000));
    const url = SLIDE_IMAGE_BASE
      ? `${SLIDE_IMAGE_BASE}/slides/${screenId}/${versionHash}/slide_${index}.jpg`
      : '';
    return {
      type: 'image' as const,
      url,
      duration,
      transition_effect: transitionEffect,
      transition_duration: transitionDuration,
    };
  });

  try {
    await uploadLayoutSnapshotJson(screenId, versionHash, {
      version: versionHash,
      backgroundColor: '#000000',
      slides,
    });
  } catch (e) {
    console.error('[generate-slides-internal] layout_snapshot upload failed', e);
  }

  let deletedCount = 0;
  try {
    deletedCount = await deleteSlidesExceptVersion(screenId, versionHash);
  } catch (e) {
    console.error('[generate-slides-internal] cleanup failed', e);
  }

  try {
    await supabase
      .from('screens')
      .update({
        updated_at: new Date().toISOString(),
        layout_snapshot_version: versionHash,
      })
      .eq('id', screenId);
  } catch (e) {
    console.error('[generate-slides-internal] update layout_snapshot_version failed', e);
  }

  console.log('[generate-slides-internal] screen=' + screenId + ' generated=' + generatedCount + ' deleted=' + deletedCount);
  return {
    generated: generatedCount,
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
