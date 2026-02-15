/**
 * Display sayfası ve block şablonları için font yükleme.
 * Halka açık linkte ve Roku screenshot'ta yazı stili tutarlılığı sağlar.
 */
import { getGoogleFontsUrlForDisplayFamilies } from '@/lib/editor-fonts';

const SYSTEM_FONTS = new Set([
  'Arial', 'Arial Black', 'Georgia', 'Impact', 'Times New Roman',
  'Trebuchet MS', 'Verdana', 'Comic Sans MS', 'Courier New', 'Helvetica',
  'system-ui', 'sans-serif', 'serif', 'monospace', 'cursive',
]);

/** Block template (screenBlocks, blockContents) verisinden font ailelerini toplar */
export function collectFontFamiliesFromBlockTemplate(data: {
  screen?: { font_family?: string };
  screenBlocks?: Array<{ style_config?: string | Record<string, unknown> }>;
  blockContents?: Array<Record<string, unknown>>;
}): string[] {
  const families = new Set<string>();

  if (data?.screen?.font_family) {
    const f = String(data.screen.font_family).trim();
    if (f && !SYSTEM_FONTS.has(f)) families.add(f);
  }

  const extractFromStyleConfig = (styleConfig: Record<string, unknown> | null) => {
    if (!styleConfig) return;
    const layers =
      (styleConfig.textLayers as Array<Record<string, unknown>>) ??
      (styleConfig.videoTextLayers as Array<Record<string, unknown>>) ??
      [];
    for (const layer of layers) {
      const ff = (layer.fontFamily as string) ?? (layer.font_family as string);
      if (ff && typeof ff === 'string') {
        const f = ff.trim().replace(/^["']|["']$/g, '');
        if (f && !SYSTEM_FONTS.has(f)) families.add(f);
      }
    }
  };

  for (const block of data?.screenBlocks ?? []) {
    if (!block.style_config) continue;
    try {
      const cfg =
        typeof block.style_config === 'string'
          ? JSON.parse(block.style_config) ?? {}
          : (block.style_config as Record<string, unknown>) ?? {};
      extractFromStyleConfig(cfg);
    } catch {
      /* ignore */
    }
  }

  return [...families];
}

/** Font ailelerini yükler; document.fonts.ready döner. */
export async function loadFontsForDisplayFamilies(families: string[]): Promise<void> {
  if (families.length === 0) return;
  const url = getGoogleFontsUrlForDisplayFamilies(families);
  if (!url) return;

  const existing =
    typeof document !== 'undefined' &&
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
      (el) => (el as HTMLLinkElement).href === url
    );
  if (existing) {
    if (typeof document?.fonts?.ready !== 'undefined') await document.fonts.ready;
    return;
  }

  await new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });

  const loads: Promise<unknown>[] = [];
  for (const f of families.slice(0, 20)) {
    loads.push(document.fonts.load(`16px "${f}"`).catch(() => {}));
    loads.push(document.fonts.load(`700 16px "${f}"`).catch(() => {}));
    loads.push(document.fonts.load(`italic 16px "${f}"`).catch(() => {}));
    loads.push(document.fonts.load(`italic 700 16px "${f}"`).catch(() => {}));
  }
  await Promise.all(loads);
  if (typeof document.fonts.ready !== 'undefined') await document.fonts.ready;
}
