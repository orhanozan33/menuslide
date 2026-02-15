'use client';

import { useEffect, useState } from 'react';
import { getGoogleFontsUrlForDisplayFamilies } from '@/lib/editor-fonts';

const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?|$)/i;
const DATA_VIDEO = /^data:video\//i;
/** Herhangi bir string video kaynağı mı (Fabric'ın yükleyemeyeceği) */
function isVideoSrc(s: string): boolean {
  if (!s || typeof s !== 'string') return false;
  if (DATA_VIDEO.test(s)) return true;
  if (VIDEO_EXT.test(s)) return true;
  if (/video\/|\.(mp4|webm|ogg|mov)/i.test(s)) return true;
  return false;
}

/** 1x1 şeffaf PNG – Fabric'ın hata vermeden yükleyebileceği placeholder */
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** JSON içindeki tüm string değerleri özyinelemeli tarar; video gibi görünenleri placeholder ile değiştirir. Fabric'a hiç video src gitmez. */
function sanitizeVideoSources(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (isVideoSrc(value)) return PLACEHOLDER_IMAGE;
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitizeVideoSources);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeVideoSources(v);
    return out;
  }
  return value;
}

function isVideoLikeImage(o: Record<string, unknown>, removeAllImages: boolean): boolean {
  const type = (o?.type as string) ?? '';
  const src = typeof o?.src === 'string' ? o.src : '';
  const isImage = type === 'image' || type === 'FabricImage';
  if (!isImage) return false;
  if (removeAllImages) return true;
  return isVideoSrc(src) || !src;
}

function filterObjectsRecursive(items: unknown[] | undefined, removeAllImages: boolean): unknown[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
    const o = item as Record<string, unknown>;
    if (isVideoLikeImage(o, removeAllImages)) return false;
    if ((o?.type as string) === 'group' && Array.isArray(o.objects)) {
      o.objects = filterObjectsRecursive(o.objects as unknown[], removeAllImages);
    }
    return true;
  });
}

/** canvas_json içindeki videolu nesneleri çıkarır (grup içleri dahil). Önce sanitizeVideoSources kullanmak daha güvenli. */
export function stripVideoLikeObjects(json: Record<string, unknown>, removeAllImages: boolean): Record<string, unknown> {
  const obj = JSON.parse(JSON.stringify(json)) as Record<string, unknown>;
  const objects = obj.objects as unknown[] | undefined;
  if (Array.isArray(objects)) obj.objects = filterObjectsRecursive(objects, removeAllImages);
  return obj;
}

/** Font adından tırnakları kaldırır (Fabric bazen "Dancing Script" olarak saklar). */
export function normalizeFontFamily(name: string): string {
  return name.replace(/^["']|["']$/g, '').trim();
}

/** Fabric canvas JSON içinden kullanılan font ailelerini toplar (gruplar dahil). */
export function collectFontFamiliesFromFabricJson(obj: Record<string, unknown>): string[] {
  const families: string[] = [];
  const type = String(obj?.type ?? '');
  const fontFamily = obj?.fontFamily;
  if (type && ['text', 'i-text', 'textbox', 'Textbox'].includes(type) && typeof fontFamily === 'string' && fontFamily.trim()) {
    const clean = normalizeFontFamily(fontFamily);
    if (clean) families.push(clean);
  }
  const objects = obj?.objects;
  if (Array.isArray(objects)) {
    for (const item of objects) {
      if (item && typeof item === 'object') families.push(...collectFontFamiliesFromFabricJson(item as Record<string, unknown>));
    }
  }
  return families;
}

/** Şablonda kullanılan fontları yükler. loadFromJSON'dan ÖNCE çağrılmalı; böylece Fabric metin boyutlarını doğru hesaplar. */
export function loadFontsForCanvasJson(json: Record<string, unknown>): Promise<void> {
  const families = collectFontFamiliesFromFabricJson(json);
  if (families.length === 0) return Promise.resolve();
  const url = getGoogleFontsUrlForDisplayFamilies(families);
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      const loads: Promise<unknown>[] = [];
      for (const f of families.slice(0, 20)) {
        loads.push(document.fonts.load(`16px "${f}"`).catch(() => {}));
        loads.push(document.fonts.load(`700 16px "${f}"`).catch(() => {}));
        loads.push(document.fonts.load(`italic 16px "${f}"`).catch(() => {}));
        loads.push(document.fonts.load(`italic 700 16px "${f}"`).catch(() => {}));
      }
      Promise.all(loads)
        .then(async () => {
          if (typeof document.fonts.ready !== 'undefined') await document.fonts.ready;
        })
        .then(() => resolve());
    };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

/** JSON içindeki text nesnelerinin fontFamily değerini normalize eder (Fabric tırnaklı adları tanımaz). */
function normalizeFontFamiliesInValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(normalizeFontFamiliesInValue);
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === 'fontFamily' && typeof v === 'string' && ['text', 'i-text', 'textbox', 'Textbox'].includes(String(o?.type ?? ''))) {
        out[k] = normalizeFontFamily(v) || v.trim();
      } else if (k === 'objects' && Array.isArray(v)) {
        out[k] = v.map(normalizeFontFamiliesInValue);
      } else if (v !== null && typeof v === 'object') {
        out[k] = normalizeFontFamiliesInValue(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return value;
}

/** canvas_json'ı Fabric'da güvenle yüklenebilir hale getirir: video src'leri placeholder, fontFamily tırnakları temizlenir. Tüm loadFromJSON öncesi kullanılmalı. */
export function sanitizeCanvasJsonForFabric(json: Record<string, unknown>): Record<string, unknown> {
  const noVideo = sanitizeVideoSources(JSON.parse(JSON.stringify(json))) as Record<string, unknown>;
  return normalizeFontFamiliesInValue(noVideo) as Record<string, unknown>;
}

const VIDEO_SRC_KEY = '__videoSrc';

/** Image nesnelerinde video src'yi placeholder yapar ve orijinal URL'yi __videoSrc olarak saklar. Şablon uygulandıktan sonra restoreVideoObjectsInCanvas ile videolar geri yüklenir. */
function sanitizeObjectsForVideoRestore(items: unknown[]): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const o = item as Record<string, unknown>;
    const type = (o?.type as string) ?? '';
    const src = typeof o?.src === 'string' ? o.src : '';
    const isImage = type === 'image' || type === 'FabricImage';
    if (isImage && isVideoSrc(src)) {
      o.src = PLACEHOLDER_IMAGE;
      o[VIDEO_SRC_KEY] = src;
    }
    if ((o?.type as string) === 'group' && Array.isArray(o.objects)) {
      sanitizeObjectsForVideoRestore(o.objects as unknown[]);
    }
  }
}

/** Şablon uygularken kullan: video src'leri placeholder yapar, __videoSrc saklar. Load sonrası restoreVideoObjectsInCanvas çağrılmalı. */
export function sanitizeCanvasJsonForFabricWithVideoRestore(json: Record<string, unknown>): Record<string, unknown> {
  const obj = JSON.parse(JSON.stringify(json)) as Record<string, unknown>;
  const objects = obj.objects as unknown[] | undefined;
  if (Array.isArray(objects)) sanitizeObjectsForVideoRestore(objects);
  return obj;
}

/** Fabric nesnesinde __videoSrc var mı (deserialize sonrası korunuyorsa) */
export function getVideoSrcFromFabricObject(obj: Record<string, unknown>): string | null {
  const v = obj[VIDEO_SRC_KEY];
  return typeof v === 'string' ? v : null;
}

/** Full Editor canvas_json'dan thumbnail önizlemesi oluşturur (preview_image yoksa) */
export function FullEditorPreviewThumb({ canvasJson }: { canvasJson: object }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!canvasJson || typeof canvasJson !== 'object') return;
    setLoadError(false);
    let cancelled = false;
    (async () => {
      try {
        const fabric = await import('fabric');
        const w = 1920;
        const h = 1080;
        const json = canvasJson as Record<string, unknown>;
        const tryLoad = async (payload: object): Promise<import('fabric').Canvas | null> => {
          const el = document.createElement('canvas');
          el.width = w;
          el.height = h;
          const canvas = new fabric.Canvas(el, { width: w, height: h, selection: false });
          try {
            await canvas.loadFromJSON(payload);
            return canvas;
          } catch {
            canvas.dispose?.();
            return null;
          }
        };
        // Fabric'a hiç video src gitmesin: önce tüm video string'leri placeholder ile değiştir, sonra yükle.
        const sanitized = sanitizeCanvasJsonForFabric(json);
        let canvas: import('fabric').Canvas | null = null;
        canvas = await tryLoad(sanitized as object);
        if (!canvas) canvas = await tryLoad(stripVideoLikeObjects(sanitized, false) as object);
        if (!canvas) canvas = await tryLoad(stripVideoLikeObjects(sanitized, true) as object);
        if (cancelled) return;
        if (!canvas) {
          setLoadError(true);
          return;
        }
        try {
          const bg = (canvas as { backgroundColor?: string }).backgroundColor;
          if (typeof bg === 'string') canvas.backgroundColor = bg;
          canvas.renderAll();
          const url = (canvas as { toDataURL?: (o?: object) => string }).toDataURL?.({ format: 'png', multiplier: 0.5 });
          if (!cancelled && url) setDataUrl(url);
        } finally {
          canvas.dispose?.();
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [canvasJson]);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800/80 text-white/80 text-xs text-center px-2">
        Videolu şablon – önizleme gösterilemiyor
      </div>
    );
  }
  if (!dataUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800/80 text-white/80 text-xs">
        ...
      </div>
    );
  }
  return (
    <img
      src={dataUrl}
      alt=""
      className="w-full h-full object-contain"
      style={{ objectFit: 'contain', objectPosition: 'center' }}
    />
  );
}
