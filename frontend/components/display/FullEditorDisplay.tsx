'use client';

import React, { useEffect, useRef, useState } from 'react';
import { sanitizeCanvasJsonForFabric, collectFontFamiliesFromFabricJson } from '@/components/FullEditorPreviewThumb';
import { getGoogleFontsUrlForDisplayFamilies } from '@/lib/editor-fonts';
import { TemplateRoot } from './TemplateRoot';

/** Şablonda kullanılan fontları yükler; yükleme bitene kadar bekler (TV'de satır kırılımı editörle aynı olsun diye). */
function waitForFonts(families: string[]): Promise<void> {
  const loads: Promise<unknown>[] = [];
  for (const f of families.slice(0, 20)) {
    loads.push(document.fonts.load(`16px "${f}"`).catch(() => {}));
    loads.push(document.fonts.load(`700 16px "${f}"`).catch(() => {}));
    loads.push(document.fonts.load(`italic 16px "${f}"`).catch(() => {}));
    loads.push(document.fonts.load(`italic 700 16px "${f}"`).catch(() => {}));
  }
  return Promise.all(loads).then(async () => {
    if (typeof document.fonts.ready !== 'undefined') await document.fonts.ready;
  });
}

function loadFontsForDisplay(families: string[]): Promise<void> {
  if (families.length === 0) return Promise.resolve();
  const url = getGoogleFontsUrlForDisplayFamilies(families);
  if (!url) return Promise.resolve();
  const existing =
    typeof document !== 'undefined' &&
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((el) => (el as HTMLLinkElement).href === url);
  if (existing) return waitForFonts(families);
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => waitForFonts(families).then(resolve);
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

/** Image/HTMLImageElement yüklenene kadar bekler (duplicate render önlemek için). */
function waitForImageElement(el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<void> {
  if (el instanceof HTMLImageElement) {
    if (el.complete && el.naturalWidth > 0) return Promise.resolve();
    if (typeof (el as HTMLImageElement).decode === 'function') {
      return (el as HTMLImageElement).decode().catch(() => {});
    }
    return new Promise((resolve) => {
      el.onload = () => resolve();
      el.onerror = () => resolve();
    });
  }
  return Promise.resolve();
}

/** Fabric canvas'taki tüm image objelerinin yüklenmesini bekler. */
async function waitForCanvasImages(canvas: import('fabric').Canvas): Promise<void> {
  const getObjects = (canvas as { getObjects?: (type?: string) => unknown[] }).getObjects;
  if (!getObjects) return;
  const objs = getObjects.call(canvas) ?? [];
  const imagePromises: Promise<void>[] = [];
  for (const obj of objs) {
    const o = obj as { type?: string; getElement?: () => HTMLImageElement | HTMLVideoElement | HTMLCanvasElement };
    if (o.type === 'FabricImage' || o.type === 'image') {
      const el = o.getElement?.();
      if (el) imagePromises.push(waitForImageElement(el));
    }
  }
  await Promise.all(imagePromises);
}

/** Full Editor (Fabric) canvas_json render. Tek canvas instance; clear + async loadFromJSON + image bekleme; duplicate/üst üste binme yok. */
export function FullEditorDisplay({ canvasJson, onReady }: { canvasJson: object; onReady?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const canvasInstanceRef = useRef<import('fabric').Canvas | null>(null);
  const lastLoadedJsonRef = useRef<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    if (!canvasJson || typeof canvasJson !== 'object') return;
    const safeJson = sanitizeCanvasJsonForFabric(canvasJson as Record<string, unknown>) as object;
    const families = collectFontFamiliesFromFabricJson(safeJson as Record<string, unknown>);
    let cancelled = false;
    loadFontsForDisplay(families)
      .then(async () => {
        if (typeof document.fonts.ready !== 'undefined') await document.fonts.ready;
      })
      .then(() => {
        if (!cancelled) setFontsReady(true);
      });
    return () => {
      cancelled = true;
      setFontsReady(false);
    };
  }, [canvasJson]);

  useEffect(() => {
    if (!fontsReady || !canvasJson || typeof canvasJson !== 'object' || !containerRef.current) return;
    const el = containerRef.current;
    const safeJson = sanitizeCanvasJsonForFabric(canvasJson as Record<string, unknown>) as object;
    const jsonKey = JSON.stringify(safeJson);
    let cancelled = false;

    (async () => {
      try {
        const fabric = await import('fabric');
        if (cancelled) return;

        let canvas = canvasInstanceRef.current;
        if (!canvas) {
          const canvasEl = document.createElement('canvas');
          canvasEl.width = 1920;
          canvasEl.height = 1080;
          canvas = new fabric.Canvas(canvasEl, { width: 1920, height: 1080, selection: false });
          canvasInstanceRef.current = canvas;
          el.innerHTML = '';
          el.appendChild(canvasEl);
        }

        canvas.clear();

        if (lastLoadedJsonRef.current === jsonKey) {
          if (!cancelled) onReadyRef.current?.();
          return;
        }

        const reviver = (obj: Record<string, unknown>, fabricObj: unknown) => {
          const o = fabricObj as { objectCaching?: boolean; type?: string };
          if (o && (o.type === 'FabricImage' || o.type === 'image')) {
            o.objectCaching = false;
          }
          return fabricObj;
        };

        await canvas.loadFromJSON(safeJson, reviver as any);
        if (cancelled) return;

        lastLoadedJsonRef.current = jsonKey;

        await waitForCanvasImages(canvas);
        if (cancelled) return;

        const bg = (canvas as { backgroundColor?: string }).backgroundColor;
        if (typeof bg === 'string') canvas.backgroundColor = bg;
        const objs = (canvas as { getObjects?: () => unknown[] }).getObjects?.() ?? [];
        for (const obj of objs) {
          const o = obj as { selectable?: boolean; evented?: boolean; hasControls?: boolean; hasBorders?: boolean; objectCaching?: boolean };
          o.selectable = false;
          o.evented = false;
          o.hasControls = false;
          o.hasBorders = false;
          if (o.objectCaching !== false) o.objectCaching = false;
        }

        (canvas as { requestRenderAll?: () => void }).requestRenderAll?.() ?? (canvas as { renderAll?: () => void }).renderAll?.();
        if (cancelled) return;
        onReadyRef.current?.();
      } catch (e) {
        if (!cancelled) console.error('FullEditorDisplay render error:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fontsReady, canvasJson]);

  useEffect(() => {
    return () => {
      const c = canvasInstanceRef.current;
      if (c) {
        try {
          (c as { dispose?: () => Promise<boolean> | void }).dispose?.();
        } catch {
          /* ignore */
        }
        canvasInstanceRef.current = null;
        lastLoadedJsonRef.current = null;
      }
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <TemplateRoot className="w-full h-full flex items-center justify-center overflow-hidden" style={{ minHeight: 0 }}>
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden [&_canvas]:max-w-full [&_canvas]:max-h-full [&_canvas]:object-contain"
        style={{ width: '100%', height: '100%', minHeight: 0 }}
      />
    </TemplateRoot>
  );
}
