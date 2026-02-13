# Roku yayın düzeni (çalışan kurulum)

Bu belge, Roku’da yayının geldiği mevcut düzeni tarif eder. Değişiklik yaparken bu akışı bozmayın.

---

## Genel akış

1. **Display sayfası:** https://menuslide.com/display/menuslide-tv10
2. **VPS worker** bu sayfayı kaydeder → **loop.mp4** üretir (Roku HLS’i oynatamadığı için MP4 kullanılıyor).
3. **Roku uygulaması** kodu (10012) girer → API **stream_url** döner → `http://68.183.205.207/stream/menuslide-tv10/loop.mp4` oynatılır.

---

## Sunucu (68.183.205.207)

### Worker: display → video

- **Script:** `vps-video-worker.js` (sayfayı Puppeteer ile açar, kaydeder, hem HLS hem **loop.mp4** üretir).
- **Döngü süresi:** Worker, `GET /api/public-screen/{slug}` ile ekranın `templateRotations` verisini alır; her şablonun `display_duration` değerlerini toplar ve kayıt süresini bu toplam süreye göre ayarlar (min 30 sn, max 600 sn). Böylece tüm şablonlar tek döngüde kaydedilir.
- **Çıktı:** `/var/www/menuslide/stream/menuslide-tv10/` içinde `loop.mp4` + isteğe bağlı `playlist.m3u8` ve segmentler.
- **Roku için kullanılan:** Sadece `loop.mp4`.

### Cron (her 5 dakika)

```cron
*/5 * * * * cd /var/www/menuslide/app && DISPLAY_BASE_URL=https://menuslide.com SCREEN_SLUGS=menuslide-tv10 STREAM_OUTPUT_DIR=/var/www/menuslide/stream node vps-video-worker.js >> /var/www/menuslide/app/worker.log 2>&1
```

### Nginx

- `/stream/` → `alias /var/www/menuslide/stream/`
- `loop.mp4` ve `.m3u8`/`.ts` bu dizinden sunulur.

### Admin / veritabanı

- **menuslide-tv10** ekranının **stream_url** değeri:
  ```text
  http://68.183.205.207/stream/menuslide-tv10/loop.mp4
  ```
- Bu adres değişirse Roku yanlış/boş yayın alır.

---

## Roku uygulaması

- **Kayıt:** Kodu (10012) girer → API’den `deviceToken` + `layout` (içinde `videoUrl` = stream_url) alır.
- **Oynatma:** `videoUrl` `.m3u8` ise HLS, `.mp4` ise MP4 (şu an MP4).
- **Döngü:** VOD bittiğinde (`state=finished`) içerik yeniden yüklenip tekrar `play`.
- **Hata:** Retry’da içerik tamamen yeniden yüklenir (sadece `play` değil).
- **Task alanları:** LayoutTask ve HeartbeatTask XML’de `id="input"` ve `id="result"` kullanılır (Roku “nonexistent field” vermesin diye).

---

## Önemli dosyalar

| Ne | Nerede |
|----|--------|
| Video worker | `scripts/vps-video-worker.js` (display → loop.mp4) |
| MP4 tek seferlik | `scripts/stream-mp4-once.sh` (manuel input.mp4 → loop.mp4) |
| Roku MainScene | `roku-tv/components/MainScene.brs` (video state, retry, finished→replay) |
| Roku Task XML | `roku-tv/components/LayoutTask.xml`, `HeartbeatTask.xml` (field id) |
| Nginx stream | `docs/nginx-menuslide-cdn.conf` (location /stream/) |

---

## Yeni ekran eklerken

1. Admin’de ekran oluştur, **stream_url** = `http://68.183.205.207/stream/<slug>/loop.mp4`.
2. Cron’a slug ekle: `SCREEN_SLUGS=menuslide-tv10,yeni-slug` veya `SCREEN_SLUGS_FILE` kullan.
3. Worker aynı mantıkla `https://menuslide.com/display/<slug>` sayfasını kaydedip `loop.mp4` üretir.

---

## Bu düzeni korumak

- **stream_url**’i yalnızca aynı sunucu/dizin yapısına uygun şekilde değiştirin.
- Worker’da **loop.mp4** üretimini (Roku uyumlu baseline MP4) kaldırmayın.
- Roku tarafında **finished** sonrası yeniden yükleme ve **retry**’da tam yeniden yükleme mantığını bozmayın.
- Task node’larda **id** kullanımını (input/result) değiştirmeyin.

Bu düzen korunduğu sürece Roku’da yayın aynı şekilde çalışmaya devam eder.
