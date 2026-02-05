/**
 * Resolves media URLs (images, videos) so they work in both local and production.
 * - Absolute URLs (http/https): returned as-is
 * - Data URLs (data:...): returned as-is
 * - Relative paths (/uploads/..., /...): prefixed with app origin so they work
 *   when the display is on Vercel (public/uploads files are in deployment)
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('data:')) return u;
  // Relative path: use app origin so /uploads/xxx works on Vercel
  if (u.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${u}`;
    }
    // SSR: use NEXT_PUBLIC_APP_URL if set (e.g. https://menuslide.vercel.app)
    const base = process.env.NEXT_PUBLIC_APP_URL || '';
    return base ? `${base.replace(/\/$/, '')}${u}` : u;
  }
  // Path without leading slash: might be backend path
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  if (apiBase) {
    return `${apiBase.replace(/\/$/, '')}${u.startsWith('/') ? '' : '/'}${u}`;
  }
  return u;
}
