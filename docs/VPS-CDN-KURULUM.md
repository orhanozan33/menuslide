# VPS Üzerinde CDN ve Ekran Görüntüsü (Screenshot) Kurulumu

Bu rehber, kendi VPS’inde (DigitalOcean, Hetzner, vb.) Nginx ile CDN mantığı ve Puppeteer ile ekran görüntüsü üretimini adım adım anlatır.

---

## 1. Sunucu hazırlığı (Ubuntu/Debian)

SSH ile VPS’e bağlanıp:

```bash
# Sistem güncelleme
sudo apt update && sudo apt upgrade -y

# Puppeteer/Chromium için gerekli kütüphaneler
sudo apt install -y libgbm-dev wget unzip fontconfig locales gconf-service \
  libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 \
  libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
  libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
  libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
  libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
  ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils

# Nginx
sudo apt install -y nginx
```

---

## 2. CDN dizini ve Nginx yapılandırması

### 2.1 Dizin oluşturma

```bash
sudo mkdir -p /var/www/menuslide/cdn
sudo chown -R www-data:www-data /var/www/menuslide
sudo chmod 755 /var/www/menuslide/cdn
```

### 2.2 Nginx site konfigürasyonu

`/etc/nginx/sites-available/menuslide-cdn` dosyasını oluştur:

```bash
sudo nano /etc/nginx/sites-available/menuslide-cdn
```

Aşağıdaki bloğu yapıştır; `server_name` ve `ssl_*` satırlarını kendi domain/IP’ne göre düzenle:

```nginx
server {
    listen 80;
    server_name cdn.menuslide.com;   # veya VPS IP: 123.45.67.89

    location /cdn/ {
        alias /var/www/menuslide/cdn/;

        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,Accept';
        if ($request_method = 'OPTIONS') {
            return 204;
        }

        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
            image/jpeg jpg jpeg;
            image/png png;
        }
        default_type application/octet-stream;
    }
}
```

Site’ı etkinleştir ve Nginx’i test et:

```bash
sudo ln -s /etc/nginx/sites-available/menuslide-cdn /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 2.3 SSL (Let’s Encrypt) – domain kullanıyorsan

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cdn.menuslide.com
```

DNS’te `cdn.menuslide.com` A kaydını VPS IP’sine yönlendirmiş olmalısın.

---

## 3. Puppeteer screenshot worker (VPS’te çalışacak script)

**LEGACY:** vps-screenshot-worker eski CDN yapısı ({slug}.jpg) kullanır. Güncel sistem `slides/{screenId}/{templateId}.jpg` + Spaces kullanıyor. Bkz: `docs/LEGACY-SCRIPTS.md`

Projede `scripts/legacy/vps-screenshot-worker.js` var. VPS’e projeyi klonlayıp veya sadece bu script + `package.json` (puppeteer bağımlılığı) ile çalıştırabilirsin.

### 3.1 VPS’te Node ve script kurulumu

```bash
# Node 20 (örnek)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Worker için klasör (projeden scripts/legacy/vps-screenshot-worker.js kopyala)
sudo mkdir -p /var/www/menuslide/app
cd /var/www/menuslide/app
sudo cp /path/to/Tvproje/scripts/legacy/vps-screenshot-worker.js .
npm init -y
npm install puppeteer
# Çalıştırma: aşağıdaki env'lerle node scripts/legacy/vps-screenshot-worker.js
```

### 3.2 Ortam değişkenleri

Worker şu env’leri kullanır:

| Değişken | Açıklama | Örnek |
|----------|----------|--------|
| `DISPLAY_BASE_URL` | Ekran sayfasının base URL’i | `https://menuslide.com` |
| `OUTPUT_DIR` | Screenshot’ların yazılacağı dizin | `/var/www/menuslide/cdn` |
| `SCREEN_SLUGS` | Virgülle ayrılmış ekran slug’ları | `menuslide-tv10,menuslide-tv11` |
| `SCREEN_SLUGS_FILE` | Slug listesi dosyası (her satırda bir slug); 200 TV için kullanışlı | `/var/www/menuslide/slugs.txt` |
| `CONCURRENCY` | Aynı anda kaç ekran (paralel tarayıcı sekmesi); varsayılan 5 | `10` |

Örnek (az ekran):

```bash
export DISPLAY_BASE_URL="https://menuslide.com"
export OUTPUT_DIR="/var/www/menuslide/cdn"
export SCREEN_SLUGS="menuslide-tv10,menuslide-tv11"
node scripts/legacy/vps-screenshot-worker.js
```

### 3.3 Cron ile periyodik çalıştırma (ör. 5 dakikada bir)

```bash
crontab -e
```

**Az ekran (ör. 10 TV):**

```
*/5 * * * * cd /var/www/menuslide/app && DISPLAY_BASE_URL=https://menuslide.com OUTPUT_DIR=/var/www/menuslide/cdn SCREEN_SLUGS=menuslide-tv10,menuslide-tv11 node scripts/legacy/vps-screenshot-worker.js >> /var/log/menuslide-worker.log 2>&1
```

**200 TV:** Slug listesini dosyadan okuyup paralel çalıştır (aşağıdaki “200 TV için” bölümüne bak).

Böylece ekran görüntüleri periyodik güncellenir ve Nginx `/cdn/{slug}.jpg` URL’lerinden servis eder.

---

## 4. Uygulama (Next.js) tarafında CDN base URL

VPS’teki CDN’i kullanmak için production ortamında (Vercel veya kendi sunucun) şu env’i tanımla:

- **`NEXT_PUBLIC_CDN_BASE_URL`**  
  Örnek: `https://cdn.menuslide.com`

Bu tanımlıysa, `stream_url` boş veya HLS/MP4 değilse Roku’ya dönen resim URL’si:

- `{NEXT_PUBLIC_CDN_BASE_URL}/cdn/{slug}.jpg`  
  (örn. `https://cdn.menuslide.com/cdn/menuslide-tv10.jpg`)

olur. Roku bu adresten resmi çeker; Nginx aynı path’i `/var/www/menuslide/cdn/{slug}.jpg` ile eşleştirir.

---

## 5. Roku tarafı

- Resim URL’si (`.jpg`) zaten `mainImageDisplay` (Poster) ile gösteriliyor.
- Video 404 veya hata verdiğinde placeholder akışta “İçerik hazırlanıyor, lütfen bekleyin” mesajı ve 10 saniye sonra tekrar deneme kodu eklendi.

---

## 6. Kontrol listesi

- [ ] VPS’te apt güncellemesi ve Puppeteer bağımlılıkları kuruldu
- [ ] `/var/www/menuslide/cdn` oluşturuldu, Nginx alias ile `/cdn/` yayında
- [ ] CORS ve MIME tipleri (m3u8, ts, jpg) Nginx’te tanımlı
- [ ] SSL (certbot) domain için açıldı
- [ ] `scripts/legacy/vps-screenshot-worker.js` env’lerle test edildi, `.jpg` dosyaları `OUTPUT_DIR`’e yazılıyor
- [ ] Cron ile worker periyodik çalışıyor
- [ ] `NEXT_PUBLIC_CDN_BASE_URL` production’da set, Roku doğru resim URL’sini alıyor
- [ ] Gerekirse: `tail -f /var/log/nginx/access.log` ile Roku istekleri izlendi

Bu adımlarla VPS üzerinde CDN mantığı ve ekran görüntüsü dağıtımı kurulmuş olur.

---

## 7. 200 TV için öneriler

Yaklaşık **200 ekran** için worker aynı anda birden fazla sayfa açarak (paralel) çalışır. Aşağıdaki ayarlar önerilir.

### 7.1 VPS boyutu

| Kaynak | Öneri | Neden |
|--------|--------|--------|
| **RAM** | **4–8 GB** | Her paralel Chromium sekmesi ~200–400 MB; 10 paralel ≈ 2–4 GB. |
| **CPU** | **2–4 vCPU** | 10 paralel sayfa yüklenirken CPU kullanımı artar. |
| **Plan** | **$24–48/ay** (4 GB / 2 CPU veya 8 GB / 4 CPU) | DigitalOcean “Temel” planlardan 4 GB veya 8 GB seç. |

### 7.2 Slug listesi dosyası

200 slug’ı env’de virgülle vermek zor. Supabase veya kendi veritabanından `public_slug` listesini çekip bir dosyaya yaz:

```sql
-- Supabase SQL Editor veya psql ile; sonucu slugs.txt olarak kaydet
SELECT public_slug FROM screens WHERE is_active = true ORDER BY name;
```

Dosya örneği `/var/www/menuslide/slugs.txt` (her satırda bir slug):

```
menuslide-tv1
menuslide-tv2
...
menuslide-tv200
```

### 7.3 Worker env ve cron (200 TV)

```bash
export DISPLAY_BASE_URL="https://menuslide.com"
export OUTPUT_DIR="/var/www/menuslide/cdn"
export SCREEN_SLUGS_FILE="/var/www/menuslide/slugs.txt"
export CONCURRENCY=10
node scripts/legacy/vps-screenshot-worker.js
```

**Cron:** 200 ekran × ~25 sn/ekran ÷ 10 paralel ≈ 8–10 dakika sürebilir. Cron aralığını **10 veya 15 dakika** yap; önceki çalışma bitmeden yenisini başlatma:

```
*/10 * * * * cd /var/www/menuslide/app && DISPLAY_BASE_URL=https://menuslide.com OUTPUT_DIR=/var/www/menuslide/cdn SCREEN_SLUGS_FILE=/var/www/menuslide/slugs.txt CONCURRENCY=10 node scripts/legacy/vps-screenshot-worker.js >> /var/log/menuslide-worker.log 2>&1
```

### 7.4 Özet (200 TV)

- **VPS:** 4–8 GB RAM, 2–4 vCPU (örn. DigitalOcean $24 veya $48/ay).
- **Slug listesi:** `SCREEN_SLUGS_FILE=/var/www/menuslide/slugs.txt`, dosyayı DB’den periyodik güncelle.
- **Paralel:** `CONCURRENCY=10` (isteğe göre 8–15 arası deneyebilirsin).
- **Cron:** `*/10 * * * *` (10 dakikada bir).
