# VPS Video Worker — Web Sayfasını HLS Videoya Çevirme

Bu worker, MenuSlide ekran sayfasını (Puppeteer ile) açar, 30 saniye kaydeder, FFmpeg ile HLS'e çevirir ve `/stream/{slug}/` altına yazar. Roku/Android TV bu HLS URL'sini oynatır.

---

## 1. Sunucuda (VPS) Yapılacaklar

### 1.1 FFmpeg kurulumu (şart)

```bash
apt update && apt install -y ffmpeg
```

### 1.2 Klasör ve izinler

```bash
mkdir -p /var/www/menuslide/stream
chmod -R 755 /var/www/menuslide/stream
chown -R www-data:www-data /var/www/menuslide/stream
```

(İzin hatası alırsan geçici test için: `chmod -R 777 /var/www/menuslide/stream`)

### 1.3 Node ve worker bağımlılıkları

Worker'ı çalıştıracağın dizinde (örn. `/var/www/menuslide/app`):

```bash
cd /var/www/menuslide/app
npm init -y
npm install puppeteer puppeteer-screen-recorder
```

Projeden script'i kopyala:

```bash
cp /path/to/Tvproje/scripts/vps-video-worker.js .
```

(Puppeteer ilk çalıştırmada Chromium indirir; Linux'ta gerekli kütüphaneler için:

```bash
apt install -y libgbm-dev libnss3 libatk1.0-0 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2
```

---

## 2. Worker'ı çalıştırma

Tek ekran (örn. menuslide-tv10):

```bash
DISPLAY_BASE_URL=https://menuslide.com \
STREAM_OUTPUT_DIR=/var/www/menuslide/stream \
SCREEN_SLUGS=menuslide-tv10 \
RECORD_SECONDS=30 \
node vps-video-worker.js
```

Birden fazla ekran (virgülle):

```bash
DISPLAY_BASE_URL=https://menuslide.com \
STREAM_OUTPUT_DIR=/var/www/menuslide/stream \
SCREEN_SLUGS=menuslide-tv10,menuslide-tv11 \
RECORD_SECONDS=30 \
node vps-video-worker.js
```

Slug listesi dosyadan (her satırda bir slug):

```bash
DISPLAY_BASE_URL=https://menuslide.com \
STREAM_OUTPUT_DIR=/var/www/menuslide/stream \
SCREEN_SLUGS_FILE=/var/www/menuslide/slugs.txt \
RECORD_SECONDS=30 \
node vps-video-worker.js
```

---

## 3. Çıktı URL'leri ve Admin

Worker her slug için şu dizine yazar:

- `/var/www/menuslide/stream/menuslide-tv10/playlist.m3u8`
- `/var/www/menuslide/stream/menuslide-tv10/segment000.ts`, `segment001.ts`, ...

Nginx `/stream/` path'ini bu dizine yönlendirdiği için erişim URL'si:

- **http://SUNUCU_IP/stream/menuslide-tv10/playlist.m3u8**

Admin'de ilgili ekranın **Stream URL** alanına bu adresi yaz:

- Örnek: `http://68.183.205.207/stream/menuslide-tv10/playlist.m3u8`

Roku/Android TV bu URL'yi açar; video yayını başlar.

---

## 4. Cron ile periyodik güncelleme

Her 5 dakikada bir tek ekranı yenile:

```bash
crontab -e
```

Eklenen satır:

```
*/5 * * * * cd /var/www/menuslide/app && DISPLAY_BASE_URL=https://menuslide.com STREAM_OUTPUT_DIR=/var/www/menuslide/stream SCREEN_SLUGS=menuslide-tv10 RECORD_SECONDS=30 node vps-video-worker.js >> /var/log/menuslide-video.log 2>&1
```

(30 saniyelik kayıt + dönüşüm birkaç dakika sürebilir; cron aralığını 10 dakika yapabilirsin.)

---

## 5. Fallback (puppeteer-screen-recorder yoksa)

`puppeteer-screen-recorder` kurulu değilse worker otomatik olarak **kare yakalama** moduna geçer: saniyede 2 screenshot alır, FFmpeg ile MP4 ve HLS üretir. Sadece `puppeteer` ve `ffmpeg` yeterli.

---

## 6. Sorun giderme

- **"ffmpeg bulunamadi"** → `apt install ffmpeg`
- **"puppeteer yuklu degil"** → `npm install puppeteer`
- **Chromium hatası (Linux)** → `apt install libgbm-dev libnss3 ...` (yukarıdaki liste)
- **İzin hatası** → `chmod -R 755 /var/www/menuslide/stream` veya geçici `777`
- **Roku hâlâ "Content is being prepared"** → Admin'de Stream URL'nin tam olarak `http://IP/stream/SLUG/playlist.m3u8` olduğunu kontrol et; tarayıcıda bu URL'yi açıp playlist'in indiğini doğrula.
