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

  const currentTemplateIds = new Set<string>();
  for (const r of rotations) {
    const tid =
      (r as { full_editor_template_id?: string | null }).full_editor_template_id ||
      (r as { template_id?: string | null }).template_id;
    if (tid) currentTemplateIds.add(tid);
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menuslide.com').replace(/\/$/, '');
  const keys: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rotations.length; i++) {
    const r = rotations[i] as { template_id?: string | null; full_editor_template_id?: string | null };
    const templateId = r.full_editor_template_id || r.template_id;
    if (!templateId) continue;

    const url = `${baseUrl}/display/${encodeURIComponent(String(slug))}?lite=1&rotationIndex=${i}`;
    try {
      const buffer = await captureDisplayScreenshot(url);
      if (!buffer) {
        errors.push(`Slide ${i}: screenshot alınamadı`);
        continue;
      }
      const key = await uploadSlideToSpaces(screenId, templateId, buffer);
      keys.push(key);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Slide ${i} (${templateId}): ${msg}`);
    }
  }

  let deletedCount = 0;
  try {
    deletedCount = await deleteSlidesNotInSet(screenId, currentTemplateIds);
  } catch (e) {
    console.error('[generate-slides-internal] cleanup failed', e);
  }

  if (keys.length > 0) {
    console.log(`[generate-slides-internal] screen=${screenId} generated=${keys.length} deleted=${deletedCount}`);
  }

  return {
    generated: keys.length,
    deleted: deletedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}
