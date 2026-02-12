/**
 * Her ekran (TV) için Android/Roku TV Stream URL’ini otomatik üretir.
 * NEXT_PUBLIC_STREAM_BASE_URL tanımlıysa onu kullanır (örn. https://cdn.menuslide.com/stream).
 */
export function getDefaultStreamUrl(publicSlug: string): string {
  if (!publicSlug || typeof publicSlug !== 'string') return '';
  const envBase =
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_STREAM_BASE_URL : undefined;
  const base =
    (typeof envBase === 'string' ? envBase.replace(/\/$/, '') : '') || 'https://cdn.menuslide.com/stream';
  return `${base}/${encodeURIComponent(publicSlug.trim())}.m3u8`;
}
