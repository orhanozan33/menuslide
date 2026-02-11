/**
 * Stub for bytebuffer (app-info-parser). Native memcpy Vercel'de derlenmediği için JS fallback.
 * API: memcpy(dst, dstOffset, src, srcStart, srcEnd) — bytebuffer bu imzayı kullanıyor.
 */
module.exports = function memcpy(dst, dstOffset, src, srcStart, srcEnd) {
  if (dst == null || src == null) return;
  var len;
  if (typeof srcEnd === 'number' && typeof srcStart === 'number') {
    len = srcEnd - srcStart;
  } else {
    len = typeof srcEnd === 'number' ? srcEnd : 0;
    srcStart = 0;
    dstOffset = 0;
  }
  if (len <= 0) return;
  if (typeof dstOffset !== 'number') dstOffset = 0;
  if (typeof srcStart !== 'number') srcStart = 0;
  try {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(dst) && Buffer.isBuffer(src)) {
      src.copy(dst, dstOffset, srcStart, srcStart + len);
      return;
    }
  } catch (_) {}
  var i;
  if (dst instanceof Uint8Array) {
    var srcView = src instanceof ArrayBuffer ? new Uint8Array(src, srcStart, len) : (src.byteOffset !== undefined ? new Uint8Array(src.buffer, src.byteOffset + srcStart, len) : new Uint8Array(src, srcStart, len));
    for (i = 0; i < len; i++) dst[dstOffset + i] = srcView[i];
    return;
  }
  if (dst instanceof ArrayBuffer) dst = new Uint8Array(dst, dstOffset, len);
  else if (dst.buffer) dst = new Uint8Array(dst.buffer, dst.byteOffset + dstOffset, len);
  src = src instanceof ArrayBuffer ? new Uint8Array(src, srcStart, len) : (src.byteOffset !== undefined ? new Uint8Array(src.buffer, src.byteOffset + srcStart, len) : new Uint8Array(src, srcStart, len));
  for (i = 0; i < len; i++) dst[i] = src[i];
};
