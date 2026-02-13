# VPS’e worker atma ve cron kurma

Bu rehber: güncel **vps-video-worker.js** dosyasını VPS’e nasıl atacağını ve kaydı her 5 dakikada çalıştıracak cron’u nasıl kuracağını adım adım anlatır.

---

## 1. VPS’e bağlan

Terminalde (Mac/Linux):

```bash
ssh root@SUNUCU_IP
```

Örnek: `ssh root@68.183.205.207`  
(Şifre veya SSH anahtar ile giriş yapılır.)

---

## 2. Proje / worker klasörünü bul veya oluştur

Worker’ın çalışacağı dizin genelde:

- `/var/www/menuslide/app`

Eğer bu dizin yoksa:

```bash
sudo mkdir -p /var/www/menuslide/app
cd /var/www/menuslide/app
```

Eğer proje zaten Git ile VPS’teyse:

```bash
cd /var/www/menuslide   # veya projenin olduğu yol
# Worker scripts/ altındaysa: /var/www/menuslide veya /root/Tvproje
```

---

## 3. Güncel worker dosyasını VPS’e at

**Seçenek A – Bilgisayarından SCP ile (tek dosya):**

Bilgisayarında (worker’ın olduğu proje kökünde):

```bash
scp -i ~/.ssh/id_ed25519 /Users/admin/Desktop/Tvproje/scripts/vps-video-worker.js root@SUNUCU_IP:/var/www/menuslide/app/
```

Worker `scripts/` altındaysa ve VPS’te de `app` içinde `scripts` varsa:

```bash
scp -i ~/.ssh/id_ed25519 /Users/admin/Desktop/Tvproje/scripts/vps-video-worker.js root@SUNUCU_IP:/var/www/menuslide/app/scripts/
```

**Seçenek B – VPS’te proje Git ile ise:**

Bilgisayarında commit + push yaptıysan, VPS’te:

```bash
cd /var/www/menuslide   # veya proje dizini
git pull origin main
```

Worker `scripts/vps-video-worker.js` ise çekince güncel hali gelir.

**Seçenek C – FileZilla (SFTP):**

1. FileZilla’yı aç → **Dosya → Site Yöneticisi → Yeni Site**
2. **Genel:** Protokol: **SFTP - SSH File Transfer Protocol**, Sunucu: VPS IP (örn. `68.183.205.207`), Kullanıcı: `root`, Şifre veya SSH anahtar dosyası.
3. **Bağlan** → Sol tarafta yerel proje klasörüne git.
4. **Atılacak dosya:**

   | Yerel (sol) | Uzak (sağ) |
   |-------------|------------|
   | `Tvproje/scripts/vps-video-worker.js` | `/var/www/menuslide/app/vps-video-worker.js` **veya** `/var/www/menuslide/scripts/vps-video-worker.js` |

   Uzak tarafta `app` mi yoksa `scripts` mi kullandığına göre hedefi seç (cron’daki `cd` ve `node .../vps-video-worker.js` yolu ile uyumlu olsun).
5. `vps-video-worker.js` dosyasını sağ panele (VPS’e) sürükleyip bırak → Üzerine yaz (güncelle).

---

## 4. Node ve bağımlılıkları kontrol et

VPS’te (worker’ın çalışacağı dizinde):

```bash
cd /var/www/menuslide/app
node -v          # Node 18+ olmalı
npm install      # package.json varsa
```

Worker tek başına çalışıyorsa ve `package.json` aynı dizinde değilse, proje kökünden:

```bash
cd /var/www/menuslide   # veya proje kökü
npm install
```

Gerekli paketler: `puppeteer`, `puppeteer-screen-recorder`. Proje kökünde `npm install` yapıldıysa genelde yüklüdür.

---

## 5. Ortam değişkenlerini ayarla

Worker şunları kullanır:

- `DISPLAY_BASE_URL` – Display sayfasının açılacağı site (örn. https://menuslide.com)
- `STREAM_OUTPUT_DIR` – HLS ve loop.mp4 çıktı dizini (örn. /var/www/menuslide/stream)
- `SCREEN_SLUGS` – Virgülle ayrılmış ekran slug’ları (örn. menuslide-tv10,menuslide-tv11)
- İsteğe bağlı: `SCREEN_SLUGS_FILE` – Her satırda bir slug olan dosya yolu
- İsteğe bağlı: `RECORD_SECONDS`, `CONCURRENCY`

**Geçici (sadece o oturum için):**

```bash
export DISPLAY_BASE_URL="https://menuslide.com"
export STREAM_OUTPUT_DIR="/var/www/menuslide/stream"
export SCREEN_SLUGS="menuslide-tv10"
```

**Kalıcı (her girişte):**

```bash
echo 'export DISPLAY_BASE_URL="https://menuslide.com"' >> ~/.bashrc
echo 'export STREAM_OUTPUT_DIR="/var/www/menuslide/stream"' >> ~/.bashrc
echo 'export SCREEN_SLUGS="menuslide-tv10"' >> ~/.bashrc
source ~/.bashrc
```

Veya cron’da doğrudan env ile verirsin (adım 6).

---

## 6. Çıktı dizinini oluştur

```bash
sudo mkdir -p /var/www/menuslide/stream
sudo chown -R $USER:$USER /var/www/menuslide/stream
# veya www-data kullanıyorsan: sudo chown -R www-data:www-data /var/www/menuslide/stream
```

---

## 7. Cron’u kur (her 5 dakikada çalışsın)

Crontab’ı aç:

```bash
crontab -e
```

Aşağıdaki satırlardan birini ekle (yol ve slug’ları kendine göre değiştir).

**Worker tek dosyaysa (örn. app içinde vps-video-worker.js):**

```cron
*/5 * * * * cd /var/www/menuslide/app && DISPLAY_BASE_URL=https://menuslide.com STREAM_OUTPUT_DIR=/var/www/menuslide/stream SCREEN_SLUGS=menuslide-tv10 node vps-video-worker.js >> /var/log/menuslide-video.log 2>&1
```

**Worker proje içinde scripts/ altındaysa:**

```cron
*/5 * * * * cd /var/www/menuslide && DISPLAY_BASE_URL=https://menuslide.com STREAM_OUTPUT_DIR=/var/www/menuslide/stream SCREEN_SLUGS=menuslide-tv10 node scripts/vps-video-worker.js >> /var/log/menuslide-video.log 2>&1
```

Kaydet ve çık (vim: `Esc` → `:wq` → Enter).

Cron her **5 dakikada** bu komutu çalıştırır; worker sayfayı açar, kaydeder, HLS + loop.mp4 üretir.

---

## 8. İlk çalıştırmayı test et

Cron’u beklemeden elle dene:

```bash
cd /var/www/menuslide/app
DISPLAY_BASE_URL=https://menuslide.com STREAM_OUTPUT_DIR=/var/www/menuslide/stream SCREEN_SLUGS=menuslide-tv10 node vps-video-worker.js
```

(Worker `scripts/` altındaysa `cd`’i proje köküne alıp `node scripts/vps-video-worker.js` kullan.)

Log’da hata yoksa ve `/var/www/menuslide/stream/menuslide-tv10/` altında `loop.mp4` ve `playlist.m3u8` oluştuysa cron da aynı şekilde çalışacaktır.

---

## 9. Log’u takip et

```bash
tail -f /var/log/menuslide-video.log
```

Çıktıyı izleyerek her 5 dakikada kaydın tetiklenip tetiklenmediğini ve hata olup olmadığını görebilirsin.

---

## Kısa özet

| Adım | Ne yapıyorsun |
|------|-------------------------------|
| 1 | `ssh root@SUNUCU_IP` ile VPS’e bağlan. |
| 2 | Worker’ın çalışacağı dizini bul/oluştur (örn. `/var/www/menuslide/app`). |
| 3 | Güncel `vps-video-worker.js` dosyasını SCP / Git / FileZilla ile VPS’e at. |
| 4 | Aynı dizinde (veya proje kökünde) `node -v` ve `npm install` yap. |
| 5 | DISPLAY_BASE_URL, STREAM_OUTPUT_DIR, SCREEN_SLUGS (ve gerekirse diğer env) ayarla. |
| 6 | STREAM_OUTPUT_DIR dizinini oluştur, izinleri ver. |
| 7 | `crontab -e` ile `*/5 * * * * cd ... && ... node vps-video-worker.js >> ...` satırını ekle. |
| 8 | Aynı komutu terminalde elle çalıştırıp test et. |
| 9 | `tail -f /var/log/menuslide-video.log` ile takip et. |

Bu adımlarla worker VPS’e atılmış ve her 5 dakikada çalışacak şekilde ayarlanmış olur.
