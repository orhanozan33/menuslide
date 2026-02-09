'use client';

import { useEffect, useState } from 'react';

/** Full Editor canvas_json'dan thumbnail önizlemesi oluşturur (preview_image yoksa) */
export function FullEditorPreviewThumb({ canvasJson }: { canvasJson: object }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasJson || typeof canvasJson !== 'object') return;
    let cancelled = false;
    (async () => {
      try {
        const fabric = await import('fabric');
        const el = document.createElement('canvas');
        const w = 1920;
        const h = 1080;
        el.width = w;
        el.height = h;
        const canvas = new fabric.Canvas(el, { width: w, height: h, selection: false });
        const json = canvasJson as object;
        await canvas.loadFromJSON(json);
        const bg = (canvas as { backgroundColor?: string }).backgroundColor;
        if (typeof bg === 'string') canvas.backgroundColor = bg;
        canvas.renderAll();
        const url = (canvas as { toDataURL?: (o?: object) => string }).toDataURL?.({ format: 'png', multiplier: 0.5 });
        if (!cancelled && url) setDataUrl(url);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [canvasJson]);

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
