# Vercel Log Hataları Özeti

`logs_result.json` (1223 kayıt) analizine göre öne çıkan hatalar ve yapılan düzeltmeler.

## İstatistikler

- **Toplam:** 1223 istek
- **500:** 384
- **502:** 96
- **200:** 392
- **307:** 212 (redirect)

## 1. `GET /sw.js` → 500 – “Cannot read properties of null (reading 'useState')”

**Sebep:** `/sw.js` (service worker) isteği `[locale]` segmentiyle eşleşiyordu; `locale = "sw.js"` olunca sayfa ağacı sunucuda render edilirken React hook (useState) hatası oluşuyordu.

**Yapılan:** `app/[locale]/layout.tsx` içinde geçerli locale kontrolü eklendi. Sadece `en`, `tr`, `fr` kabul ediliyor; diğerleri (örn. `sw.js`) için `notFound()` çağrılıyor. Sonuç: `/sw.js` artık 404 döner, 500 oluşmaz.

## 2. `[api/proxy] Error: TypeError: fetch failed` / 502

**Sebep:** Proxy veya backend’e yapılan `fetch` başarısız (bağlantı yok, timeout, vb.). Vercel’de `NEXT_PUBLIC_API_URL` boşken istekler kendi `/api/proxy`’e yönlendirilmeli; ortam değişkeni veya yanlış base URL buna engel olabilir.

**Kontrol listesi:**

- Vercel’de `NEXT_PUBLIC_API_URL` **boş** (veya tanımsız).
- `SUPABASE_SERVICE_ROLE_KEY` **tanımlı** (proxy Supabase kullanıyor).
- Gerekirse redeploy.

## 3. `[api/registration-requests] GET error: TypeError: fetch failed` / 502

**Sebep:** `/api/registration-requests` route’u harici backend’e (veya kendi proxy’e) istek atıyor; fetch başarısız olunca 502 dönüyor.

**Yapılan (önceki adımda):** `NEXT_PUBLIC_API_URL` boşken bu route artık kendi uygulamanın `/api/proxy/registration-requests` adresine istek atıyor (`TARGET_BASE` + `/api/proxy/...`). Yine `SUPABASE_SERVICE_ROLE_KEY` ve redeploy gerekir.

## En çok hata alan path’ler

- `menuslide.com/api/proxy/auth/me`
- `menuslide.com/api/registration-requests`
- `menuslide.com/tr/templates`
- `menuslide.com/tr/dashboard`

Bu path’lerdeki 500/502’ler büyük ölçüde yukarıdaki proxy/env ve `/sw.js` düzeltmeleriyle azalmalı. Hâlâ 502 görülürse Vercel env (özellikle `SUPABASE_SERVICE_ROLE_KEY`) ve redeploy tekrar kontrol edilmeli.
