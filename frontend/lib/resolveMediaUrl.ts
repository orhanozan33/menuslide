const STORAGE_BUCKET = 'menuslide';

/**
 * Resolves a path in the menuslide bucket to the Supabase Storage public URL.
 * - Paths like /uploads/filename (single segment) are stored at uploads/migrated/filename by migrate script.
 * - Paths like /uploads/YYYY-MM-DD/filename from new uploads stay as uploads/YYYY-MM-DD/filename.
 */
export function getStoragePublicUrl(path: string): string {
  const base = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return path;
  let baseUrl = base.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
    baseUrl = baseUrl.replace(/^http:\/\//i, 'https://');
  }
  let clean = path.replace(/^\/+/, '');
  // Single-segment /uploads/file.jpg → uploads/migrated/file.jpg (migration script convention)
  if (/^uploads\/[^/]+$/.test(clean)) {
    clean = `uploads/migrated/${clean.replace(/^uploads\//, '')}`;
  }
  return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${clean}`;
}

/**
 * Resolves media URLs so they work everywhere and are served from Storage when possible.
 * - Absolute URLs (http/https): returned as-is
 * - Data URLs (data:...): returned as-is
 * - Paths under uploads/ or /uploads/: resolved to Supabase Storage public URL (fast, CDN-friendly)
 * - Other relative paths: prefixed with app origin for backward compatibility
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && u.startsWith('http://')) {
      return u.replace(/^http:\/\//i, 'https://');
    }
    return u;
  }
  if (u.startsWith('data:')) return u;
  // All uploads go through Storage: /uploads/... or uploads/... → Supabase Storage public URL
  if (u.startsWith('/uploads/') || u.startsWith('uploads/')) {
    return getStoragePublicUrl(u);
  }
  // Other relative path: app origin (e.g. same-origin static)
  if (u.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${u}`;
    }
    const base = process.env.NEXT_PUBLIC_APP_URL || '';
    return base ? `${base.replace(/\/$/, '')}${u}` : u;
  }
  return u;
}
