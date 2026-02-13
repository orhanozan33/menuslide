# Supabase + Vercel + DigitalOcean ile Roku Digital Signage Yol Haritası

Elinizde: **Supabase** (veritabanı + auth), **Vercel** (frontend + API), **DigitalOcean** (VPS veya Spaces). Bu üçüyle JSON slide sistemini nasıl kuracağınız adım adım.

---

## Mimari (Ne Nerede Çalışıyor?)

```
┌─────────────────────────────────────────────────────────────────┐
│                        ROKU CİHAZLARI                            │
│  GET /api/device/layout   →  JSON (version, slides)              │
│  POST /api/device/heartbeat                                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  VERCEL (menuslide.com)                                          │
│  • Next.js frontend (admin panel, display sayfaları)             │
│  • API Routes: /api/device/layout, register, heartbeat, version    │
│  • Sadece JSON döner; görsel üretmez, video yok                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│  SUPABASE       │  │  DIGITALOCEAN   │  │  DIGITALOCEAN (opsiyonel)│
│  • PostgreSQL   │  │  SPACES         │  │  Droplet (VPS)          │
│  • screens      │  │  • Bucket:      │  │  • Eski video worker    │
│  • template_    │  │    slides/       │  │    artık gerekmez       │
│    rotations    │  │    {screenId}/   │  │  • İleride: screenshot  │
│  • Auth         │  │      {templateId}.jpg  │  │    → Spaces script   │
│                 │  │  • CDN açık     │  │    (isteğe bağlı)       │
└─────────────────┘  └─────────────────┘  └─────────────────────────┘
```

- **Supabase:** Tüm veri (ekranlar, şablonlar, rotasyonlar). API sadece buradan okuyor.
- **Vercel:** Tek giriş noktası. API burada; layout JSON burada üretilip dönüyor.
- **DigitalOcean Spaces:** Slide görselleri (JPG). API’nin döndüğü `url` burada. CDN’i Spaces üzerinden açarsan ek maliyet az.

---

## Adım 1: DigitalOcean Spaces (Görseller İçin)

### 1.1 Bucket oluştur

1. DigitalOcean Control Panel → **Spaces** → **Create Space**.
2. **Region:** İzleyicilere yakın (örn. Frankfurt veya NYC).
3. **Name:** Örn. `menuslide-signage`.
4. **File listing:** Disable (güvenlik).
5. **CDN:** Enable (görseller hızlı ve ucuz dağıtılır).
6. Oluştur.

### 1.2 Klasör yapısı

API şu URL’yi üretiyor:

`{BASE}/slides/{screenId}/{templateId}.jpg`

Spaces’te şu path’lere dosya koyacaksınız:

```
menuslide-signage (bucket)
  slides/
    {screen-id-uuid}/
      {template-id-uuid}.jpg
```

Örnek: Ekran id’si `abc-123`, şablon id’si `tpl-456` ise dosya yolu:

`slides/abc-123/tpl-456.jpg`

### 1.3 Public URL’i al

- Spaces’te bucket’a tıkla → **Settings** → **Spaces CDN** (veya **Endpoint**).
- CDN açıksa örnek (Toronto):  
  `https://menuslide-signage.tor1.cdn.digitaloceanspaces.com`
- CDN kapalıysa:  
  `https://menuslide-signage.tor1.digitaloceanspaces.com`

**Base URL:** Sondaki `/` olmadan bu adres. Örn:

`https://menuslide-signage.tor1.cdn.digitaloceanspaces.com`

### 1.4 Bucket’ı public yap (sadece okuma)

- **Settings** → **CORS** gerekirse ekle (Roku/browser’dan GET için).
- **Spaces** → bucket → **Manage** → **Permissions**: “Public” veya sadece `slides/` prefix’i public.
- Böylece `https://...cdn.../slides/abc/tpl.jpg` doğrudan açılır.

---

## Adım 2: Vercel Ortam Değişkenleri

Vercel → Proje → **Settings** → **Environment Variables**. Aşağıdakileri ekle veya güncelle.

### Zaten olması gerekenler (Supabase)

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (API; layout/register için) |

### Slide görselleri için (DigitalOcean Spaces)

| Değişken | Değer | Açıklama |
|----------|--------|----------|
| `NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL` | `https://menuslide-signage.tor1.cdn.digitaloceanspaces.com` | Spaces CDN base URL (sondaki `/` yok). API, slide URL’lerini `{bu}/slides/{screenId}/{templateId}.jpg` yapar. |

İstersen `NEXT_PUBLIC_CDN_BASE_URL` da aynı değeri verebilirsin; kod ikisini de kullanıyor.

### Site adresi

| Değişken | Değer |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://menuslide.com` (veya kendi domain’in) |

Kaydedip bir kez **Redeploy** et.

---

## Adım 3: Görselleri Spaces’e Yükleme

API sadece URL üretir; dosyaları sen koyacaksın. Üç yol:

### Yol A: Manuel (test için)

1. Supabase’den bir ekranın `id` ve şablon rotasyonlarındaki `template_id` / `full_editor_template_id` değerlerini al.
2. Görseli hazırla (1920x1080 JPG önerilir).
3. DO Spaces → bucket → `slides/{screen-id}/{template-id}.jpg` olarak yükle (drag & drop veya CLI).

### Yol B: DO Spaces CLI (script ile)

DigitalOcean’da **Spaces API** anahtarı oluştur (Access Key + Secret). Sonra:

```bash
# s3cmd veya aws cli ile (Spaces S3 uyumlu)
aws configure set aws_access_key_id YOUR_SPACES_KEY
aws configure set aws_secret_access_key YOUR_SPACES_SECRET
aws s3 cp slide.jpg s3://menuslide-signage/slides/SCREEN_UUID/TEMPLATE_UUID.jpg --endpoint-url https://ams3.digitaloceanspaces.com
```

Script ile tüm ekran/şablon çiftleri için döngüyle yükleyebilirsin.

### Yol C: İleride – VPS’te screenshot → Spaces

DigitalOcean Droplet’te (eski video worker’ın olduğu sunucu) çalışan hafif bir script:

- Display sayfasını tek kare screenshot alır (Puppeteer).
- JPG’yi Spaces’e yükler: `slides/{screenId}/{templateId}.jpg`.

Bu tamamen isteğe bağlı; önce Yol A veya B ile test yeterli.

---

## Adım 4: Supabase (Zaten Var)

- `screens`, `screen_template_rotations`, `templates` tabloları mevcut.
- API layout’u buradan okuyor: ekran → rotasyonlar → her rotasyon için `slides[]` (image URL veya text).
- Ek bir tablo zorunlu değil. İleride “layout_version” için `screens.updated_at` veya ayrı bir sütun kullanabilirsin.

---

## Adım 5: Akış Özeti (Ne Sırayla Yapılır?)

| Sıra | Yapılacak | Nerede |
|------|------------|--------|
| 1 | Spaces bucket + CDN aç, base URL’i kopyala | DigitalOcean |
| 2 | `NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL` = Spaces CDN base URL | Vercel → Env |
| 3 | Redeploy | Vercel |
| 4 | En az 1 ekran için 1 görseli `slides/{screenId}/{templateId}.jpg` yükle | DigitalOcean Spaces |
| 5 | Tarayıcıdan test: `GET https://menuslide.com/api/device/layout?deviceToken=dt_XXX...` → JSON’da `slides[].url` Spaces adresi mi kontrol et | - |
| 6 | Roku’da kanalı güncelle, aktivasyon yap, slide’ların dönüp dönmediğini izle | Roku |

---

## Maliyet (Kabaca)

| Servis | Kullanım | Tahmini |
|--------|----------|---------|
| **Supabase** | DB + auth | Free tier yeterli (küçük/orta cihaz sayısı) |
| **Vercel** | Next.js + API | Free / Pro; API çağrıları hafif (sadece JSON) |
| **DigitalOcean Spaces** | Görsel depolama + CDN | ~ $5/ay (250 GB depolama + egress); CDN dahil |
| **DigitalOcean Droplet** | Eski video worker kapatıldıysa | $0 (kapatılabilir) veya ileride sadece screenshot script |

Video/HLS/FFmpeg olmadığı için encode maliyeti yok; sunucu CPU yükü düşük.

---

## Sorun Giderme

- **Slide görünmüyor (Roku’da):**  
  - API cevabında `slides[].url` gerçekten `https://...digitaloceanspaces.com/slides/.../....jpg` mi bak.  
  - Aynı URL’yi tarayıcıda aç; 403/404 ise bucket public / path yanlış.

- **API “invalid token”:**  
  - `deviceToken` formatı `dt_{screenId}_...` olmalı; Roku register’dan gelen token ile test et.

- **Sadece metin slide’ları var, görsel yok:**  
  - `NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL` boşsa API image URL üretmez, sadece text slide döner. Env’i ekleyip redeploy et.

Bu yol haritası, Supabase + Vercel + DigitalOcean ile production’da JSON slide sistemini çalıştırmak için yeterli. İstersen bir sonraki adımda Roku tarafında offline cache veya VPS screenshot → Spaces script’ini de adım adım yazabiliriz.
