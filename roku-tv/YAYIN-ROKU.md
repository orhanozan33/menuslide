# Roku Kanalı Yayına Alma

Bu dokümanda MenuSlide Digital Signage Roku kanalını yayına almak için gerekli ayarlar ve adımlar özetlenir.

## 1. Backend (Vercel / Production) Ayarları

- **NEXT_PUBLIC_APP_URL** ortam değişkeni **production URL** olmalı:
  - Örnek: `https://menuslide.com`
- Roku, API ve ekran görüntüsü (render) isteklerini bu adrese yapar:
  - Kayıt: `POST https://menuslide.com/api/device/register`
  - Layout: `GET https://menuslide.com/api/device/layout`
  - Ekran görüntüsü: `GET https://menuslide.com/api/render/{displaySlug}`

### Render (screenshot) servisi

- Roku, web sayfası yerine sunucudan alınan **resim** (JPEG) gösterir.
- Endpoint: `GET /api/render/[displayId]` — Puppeteer ile 1920x1080 screenshot döner.
- **Puppeteer** production sunucuda kurulu olmalı (`npm i puppeteer`).  
  Vercel’de sınırlı destek vardır; gerekirse Puppeteer’ı ayrı bir Node sunucusunda (örn. Railway, Render) çalıştırıp render URL’sini oraya yönlendirebilirsiniz.

## 2. Roku Kanal Paketi

- Yayın için kullanılacak paket: **`menuslide-roku.zip`**
- Oluşturmak için:
  ```bash
  cd roku-tv
  ./package.sh
  ```
- `manifest` içinde sürüm: `major_version=1`, `minor_version=0`, `build_version=19`

## 3. Roku’ya Yükleme (Sideload / Developer)

1. **Roku Developer** hesabı: [developer.roku.com](https://developer.roku.com)
2. **My Channels** → Add channel (veya mevcut kanalı güncelle)
3. **Upload** ile `menuslide-roku.zip` yükleyin
4. Cihazda **Developer Application Installer** ile yükleme:
   - Roku’da: Settings → Roku Developer Settings → Install channel
   - Bilgisayarda: **Roku Developer Application Installer** ile cihaz IP’sini girip aynı zip’i yükleyebilirsiniz

## 4. Cihazda Kullanım

1. Kanalı açın → **5 haneli kodu** girin (Admin’de ekranın broadcast code’u).
2. Klavyede **Sağ** → **Submit** (sağ üst) → **OK** ile onaylayın.
3. “Connecting...” sonrası ana ekran açılır:
   - **stream_url** (HLS/MP4) varsa: video oynar.
   - Yoksa: sunucudan alınan **ekran görüntüsü** (screenshot) her **300 saniyede** yenilenir.

## 5. Özet Kontrol Listesi

- [ ] Vercel (veya production) ortamında `NEXT_PUBLIC_APP_URL=https://menuslide.com`
- [ ] Backend’de Puppeteer kurulu veya render servisi ayrı sunucuda
- [ ] `menuslide-roku.zip` güncel sürümle paketlendi
- [ ] Roku’da kanal yüklendi ve test ekranı ile kod girilip yayın görüntüsü alındı
