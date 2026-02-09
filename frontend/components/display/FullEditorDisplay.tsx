'use client';

import React, { useEffect, useRef } from 'react';

/** Full Editor (Fabric) canvas_json'ı TV display için render eder */
export function FullEditorDisplay({ canvasJson }: { canvasJson: object }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasJson || typeof canvasJson !== 'object' || !containerRef.current) return;
    const el = containerRef.current;
    el.innerHTML = '';
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 1920;
    canvasEl.height = 1080;
    el.appendChild(canvasEl);

    let canvas: { loadFromJSON: (j: object) => Promise<void>; backgroundColor?: string; renderAll: () => void } | null = null;

    (async () => {
      try {
        const fabric = await import('fabric');
        canvas = new fabric.Canvas(canvasEl, { width: 1920, height: 1080, selection: false });
        await canvas.loadFromJSON(canvasJson as object);
        const bg = (canvas as { backgroundColor?: string }).backgroundColor;
        if (typeof bg === 'string') canvas.backgroundColor = bg;
        // TV yayınında seçim çerçevesi, tutamaçlar ve konumlandırma kontrolleri gizlensin
        const objs = (canvas as { getObjects?: () => unknown[] }).getObjects?.() ?? [];
        for (const obj of objs) {
          const o = obj as { selectable?: boolean; evented?: boolean; hasControls?: boolean; hasBorders?: boolean };
          o.selectable = false;
          o.evented = false;
          o.hasControls = false;
          o.hasBorders = false;
        }
        canvas.renderAll();
      } catch (e) {
        console.error('FullEditorDisplay render error:', e);
      }
    })();

    return () => {
      try {
        canvas?.dispose?.();
      } catch {
        /* ignore */
      }
      el.innerHTML = '';
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
