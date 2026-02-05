/** Ortak görsel saydamlık yardımcıları — tasarım ve şablon editörü */

const API_BASE = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') : '';

function resolveUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('data:')) return url;
  if (url.startsWith('/uploads')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Seçilen rengi saydam yapar; PNG data URL döner */
export function makeColorTransparent(
  imageUrl: string,
  colorHex: string,
  tolerance: number
): Promise<string> {
  const url = resolveUrl(imageUrl);
  if (!url) return Promise.reject(new Error('Geçersiz görsel'));
  return new Promise((resolve, reject) => {
    const img = typeof document !== 'undefined' ? new window.Image() : null;
    if (!img) {
      reject(new Error('Canvas desteklenmiyor'));
      return;
    }
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2d yok'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = id.data;
        let hex = colorHex.replace(/^#/, '').replace(/[^0-9A-Fa-f]/g, '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length !== 6) {
          reject(new Error('Geçersiz renk (örn. #ffffff)'));
          return;
        }
        const r0 = parseInt(hex.slice(0, 2), 16);
        const g0 = parseInt(hex.slice(2, 4), 16);
        const b0 = parseInt(hex.slice(4, 6), 16);
        const t = Math.max(0, Math.min(255, tolerance));
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (Math.abs(r - r0) <= t && Math.abs(g - g0) <= t && Math.abs(b - b0) <= t) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Görsel yüklenemedi'));
    const finalUrl = url.startsWith('/') && !url.startsWith('//') && typeof window !== 'undefined'
      ? `${window.location.origin}${url}`
      : url;
    img.src = finalUrl;
  });
}
