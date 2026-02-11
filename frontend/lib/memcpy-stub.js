/**
 * Stub for optional "memcpy" used by bytebuffer (app-info-parser).
 * Vercel/build'ta native memcpy çözülemediği için JS fallback.
 */
module.exports = function memcpy(dst, src, length) {
  if (!dst || !src || length <= 0) return;
  try {
    if (typeof dst.copy === 'function' && typeof src.copy === 'function') {
      src.copy(dst, 0, 0, length);
      return;
    }
  } catch (_) {}
  for (var i = 0; i < length; i++) dst[i] = src[i];
};
