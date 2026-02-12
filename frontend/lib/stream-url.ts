/**
 * Her ekran (TV) için Android/Roku TV Stream URL’ini otomatik üretir.
 * VPS video worker çıktısı: http://IP/stream/{slug}/playlist.m3u8
 * NEXT_PUBLIC_STREAM_BASE_URL tanımlıysa onu kullanır (örn. http://68.183.205.207/stream).
 */
export function getDefaultStreamUrl(publicSlug: string): string {
  if (!publicSlug || typeof publicSlug !== 'string') return '';
  const envBase =
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_STREAM_BASE_URL : undefined;
  const base =
    (typeof envBase === 'string' ? envBase.replace(/\/$/, '') : '') ||
    'http://68.183.205.207/stream';
  const slug = encodeURIComponent(publicSlug.trim());
  return `${base}/${slug}/playlist.m3u8`;
}
