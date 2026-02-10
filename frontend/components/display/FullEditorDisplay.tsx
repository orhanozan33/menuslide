'use client';

import React, { useEffect, useRef } from 'react';
import { sanitizeCanvasJsonForFabric } from '@/components/FullEditorPreviewThumb';
import { getGoogleFontsUrlForDisplayFamilies } from '@/lib/editor-fonts';

/** Fabric canvas JSON içinden kullanılan font ailelerini toplar (gruplar dahil). */
function collectFontFamiliesFromFabricJson(obj: Record<string, unknown>): string[] {
  const families: string[] = [];
  const type = String(obj?.type ?? '');
  const fontFamily = obj?.fontFamily;
  if (type && ['text', 'i-text', 'textbox', 'Textbox'].includes(type) && typeof fontFamily === 'string' && fontFamily.trim()) {
    families.push(fontFamily.trim());
  }
  const objects = obj?.objects;
  if (Array.isArray(objects)) {
    for (const item of objects) {
      if (item && typeof item === 'object') families.push(...collectFontFamiliesFromFabricJson(item as Record<string, unknown>));
    }
  }
  return families;
}

/** Şablonda kullanılan fontları yükler; yükleme bitene kadar bekler (TV’de satır kırılımı editörle aynı olsun diye). */
/** Tek satırlık (içinde \n yok) Textbox genişliklerini metnin gerçek genişliğine çeker; böylece "LOREM IPSUM   $0.00" yayında satır kırılmaz. */
function ensureSingleLineTextboxWidths(canvas: import('fabric').Canvas) {
  const visit = (objs: import('fabric').FabricObject[]) => {
    for (const obj of objs) {
      const g = obj as { type?: string; getObjects?: () => import('fabric').FabricObject[] };
      if (g.type === 'group' && typeof g.getObjects === 'function') {
        visit(g.getObjects());
        continue;
      }
      const type = (obj as { type?: string }).type;
      const text = (obj as { text?: string }).text;
      if ((type === 'textbox' || type === 'Textbox') && typeof text === 'string' && text.indexOf('\n') === -1 && text.trim() !== '') {
        const tb = obj as { width?: number; set: (key: string, value: number) => void; setCoords: () => void; getLineWidth?: (i: number) => number };
        const currentWidth = tb.width ?? 0;
        tb.set('width', 10000);
        tb.setCoords();
        if (typeof tb.getLineWidth === 'function') {
          try {
            const lineW = tb.getLineWidth(0);
            if (lineW > 0) tb.set('width', Math.max(currentWidth, lineW + 12));
          } catch {
            /* ignore */
          }
        }
        tb.setCoords();
      }
    }
  };
  visit(canvas.getObjects());
}

function loadFontsForDisplay(families: string[]): Promise<void> {
  if (families.length === 0) return Promise.resolve();
  const url = getGoogleFontsUrlForDisplayFamilies(families);
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      const loadPromises = families.slice(0, 20).map((f) => document.fonts.load(`16px "${f}"`).catch(() => {}));
      Promise.all(loadPromises).then(() => resolve());
    };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

/** Full Editor (Fabric) canvas_json'ı TV display için render eder. Şablondaki fontlar yüklenir; böylece ürün adı ve fiyat satır kırılımı editördeki gibi kalır. */
export function FullEditorDisplay({ canvasJson, onReady }: { canvasJson: object; onReady?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!canvasJson || typeof canvasJson !== 'object' || !containerRef.current) return;
    const el = containerRef.current;
    const safeJson = sanitizeCanvasJsonForFabric(canvasJson as Record<string, unknown>) as object;
    const families = collectFontFamiliesFromFabricJson(safeJson as Record<string, unknown>);
    let canvas: import('fabric').Canvas | null = null;
    let cancelled = false;

    (async () => {
      try {
        await loadFontsForDisplay(families);
        if (cancelled) return;
        const canvasEl = document.createElement('canvas');
        canvasEl.width = 1920;
        canvasEl.height = 1080;
        const fabric = await import('fabric');
        if (cancelled) return;
        canvas = new fabric.Canvas(canvasEl, { width: 1920, height: 1080, selection: false });
        await canvas.loadFromJSON(safeJson);
        if (cancelled) return;
        const bg = (canvas as { backgroundColor?: string }).backgroundColor;
        if (typeof bg === 'string') canvas.backgroundColor = bg;
        ensureSingleLineTextboxWidths(canvas);
        const objs = (canvas as { getObjects?: () => unknown[] }).getObjects?.() ?? [];
        for (const obj of objs) {
          const o = obj as { selectable?: boolean; evented?: boolean; hasControls?: boolean; hasBorders?: boolean };
          o.selectable = false;
          o.evented = false;
          o.hasControls = false;
          o.hasBorders = false;
        }
        canvas.renderAll();
        if (cancelled) {
          try { canvas?.dispose?.(); } catch { /* ignore */ }
          return;
        }
        el.innerHTML = '';
        el.appendChild(canvasEl);
        if (!cancelled) onReadyRef.current?.();
      } catch (e) {
        if (!cancelled) console.error('FullEditorDisplay render error:', e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        canvas?.dispose?.();
      } catch {
        /* ignore */
      }
      if (el) el.innerHTML = '';
    };
  }, [canvasJson]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden [&_canvas]:max-w-full [&_canvas]:max-h-full [&_canvas]:object-contain"
      style={{ width: '100%', height: '100%', minHeight: 0 }}
    />
  );
}
