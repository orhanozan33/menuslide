# CDN ve HLS Stream Kurulumu (Adım Adım)

MenuSlide TV uygulaması `https://cdn.menuslide.com/stream/{slug}.m3u8` adresinde HLS yayını bekler. Bu rehber, bu URL’yi çalışır hale getirmek için CDN + yayın sunucusu kurulumunu adım adım anlatır.

---

## Genel Akış

```
[Yayın kaynağı] → [Stream sunucusu / encoder] → HLS (.m3u8 + .ts) üretir
                                                         ↓
[CDN] ← origin olarak stream sunucusunu kullanır ←───────┘
   ↓
https://cdn.menuslide.com/stream/menuslide-tv10.m3u8
```

İki yol var: **Yönetilen servis** (daha kolay) veya **Kendi sunucun** (nginx + CDN).

---

## Yol 1: Yönetilen Stream + CDN (Önerilen)

### 1.1 Stream sağlayıcı seç

Aşağıdakilerden biri HLS URL’si verir; sonra bu URL’yi kendi CDN domain’ine yönlendirebilir veya doğrudan kullanabilirsin.

| Servis | Ne verir | Not |
|--------|----------|-----|
| **Mux** (mux.com) | HLS URL | Ücretli, kolay entegrasyon |
| **Bunny Stream** (bunny.net) | HLS URL + CDN | Uygun fiyat, stream + CDN birlikte |
| **AWS MediaLive + MediaPackage** | HLS URL | AWS kullanıyorsan mantıklı |
| **Cloudflare Stream** | HLS URL | Yayın + CDN tek yerde |

### 1.2 Örnek: Bunny Stream ile adımlar

1. **bunny.net** hesabı aç → **Stream** bölümüne gir.
2. **Create Video Library** → isim ver (örn. `menuslide`).
3. **Pull Zone** veya **Stream** için bir **Hostname** alırsın (örn. `menuslide.b-cdn.net`).
4. Yayın ekle:
   - **Upload** ile video yükle (tekrarlı oynatma için), veya
   - **Live** ile canlı yayın URL’si tanımla (RTMP alıcı URL’yi kullanırsın).
5. Her “ekran” (TV) için ayrı stream oluşturabilir veya tek stream’i tüm ekranlarda kullanabilirsin.
6. Her stream’in **HLS URL**’si çıkar (örn. `https://menuslide.b-cdn.net/.../playlist.m3u8`).

### 1.3 Kendi domain’i bağlama (cdn.menuslide.com)

- Bunny / Cloudflare / CloudFront’ta **Custom domain** ekle: `cdn.menuslide.com`.
- DNS’te `cdn.menuslide.com` için **CNAME** kaydı oluştur (sağlayıcının verdiği hostname’e işaret etsin).
- SSL: Sağlayıcı genelde otomatik Let’s Encrypt verir; “Full” veya “Full (strict)” seç.

Sonuç: `https://cdn.menuslide.com/stream/menuslide-tv10.m3u8` gibi bir URL’yi, CDN’in “path override” veya “origin” ayarı ile bu HLS URL’ye yönlendirirsin. Path’i tam eşleştirmek için sağlayıcı panelinde **path / rewrite** kuralı tanımlaman gerekebilir (örn. `/stream/menuslide-tv10.m3u8` → asıl playlist URL’si).

---

## Yol 2: Kendi Sunucunda HLS + CDN

Bu yol, kendi sunucunda HLS üretip önüne CDN koymak içindir.

### 2.1 Sunucu ve domain

- Bir VPS veya sunucu (Linux): örn. Ubuntu 22.04.
- İki domain (veya subdomain):
  - **origin:** `stream.menuslide.com` (HLS’in asıl sunulduğu sunucu)
  - **CDN:** `cdn.menuslide.com` (Cloudflare veya başka CDN’in domain’i)

### 2.2 Sunucuda nginx ile HLS sunma

1. **Nginx kurulumu**
   ```bash
   sudo apt update && sudo apt install -y nginx
   ```

2. **HLS dosyalarının dizini**
   Her ekran (slug) için bir klasör:
   ```bash
   sudo mkdir -p /var/www/hls/menuslide-tv10
   sudo chown -R www-data:www-data /var/www/hls
   ```
   Buraya `.m3u8` ve `.ts` dosyalarını koyacaksın (encoder veya script ile üretilir).

3. **Nginx site konfigürasyonu** (örnek)
   ```bash
   sudo nano /etc/nginx/sites-available/stream
   ```
   İçeriği:
   ```nginx
   server {
       listen 80;
       server_name stream.menuslide.com;
       root /var/www/hls;
       location /stream/ {
           add_header Access-Control-Allow-Origin *;
           add_header Cache-Control "no-cache";
           types {
               application/vnd.apple.mpegurl m3u8;
               video/mp2t ts;
           }
       }
   }
   ```
   Etkinleştir:
   ```bash
   sudo ln -s /etc/nginx/sites-available/stream /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **SSL (Let’s Encrypt)**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d stream.menuslide.com
   ```

5. **HLS içeriği üretme**
   - **Canlı değilse:** FFmpeg ile videoyu HLS’e çevirip `/var/www/hls/menuslide-tv10/` altına `playlist.m3u8` ve `.ts` dosyalarını yazdır. Roku’da kullanacağın URL: `https://stream.menuslide.com/stream/menuslide-tv10/playlist.m3u8` (veya CDN’e göre aşağıda).
   - **Canlıysa:** OBS veya FFmpeg ile RTMP/HLS push eden bir yazılım (nginx-rtmp modülü veya SRS) kullanıp aynı dizine sürekli yeni segment yazdır.

### 2.3 CDN’i origin’e bağlama (cdn.menuslide.com)

**Cloudflare ile:**

1. Cloudflare’da yeni site ekle: `menuslide.com` (zaten varsa sadece subdomain eklenir).
2. **DNS** → `cdn` (veya `cdn.menuslide.com`) için **CNAME** ekle:
   - Name: `cdn` (veya `cdn.menuslide.com` tam FQDN ise)
   - Target: `stream.menuslide.com` (HLS sunan origin sunucunun hostname’i)
   - Proxy status: **Proxied** (turuncu bulut) ki trafik CDN’den geçsin.
3. **SSL/TLS** → Full veya Full (strict); origin’de sertifika varsa “Full (strict)”.
4. **Page Rules / Redirect Rules** (gerekirse): `/stream/*` path’ini olduğu gibi origin’e ilet (varsayılan davranış genelde yeterli).

Sonuç URL: `https://cdn.menuslide.com/stream/menuslide-tv10/playlist.m3u8`  
Eğer nginx’te `location /stream/` ile dosyalar `playlist.m3u8` adındaysa, Roku’da kullanacağın tam URL’yi buna göre yazarsın. MenuSlide’da şu an beklenen format: `https://cdn.menuslide.com/stream/menuslide-tv10.m3u8` → yani path’in sonu `/{slug}.m3u8`. Bunu sağlamak için:

- Ya nginx’te `menuslide-tv10.m3u8` dosyasını `/var/www/hls/stream/menuslide-tv10.m3u8` olarak koyarsın (veya symlink),
- Ya da `location /stream/` içinde rewrite ile `.../playlist.m3u8` → `.../{slug}.m3u8` eşlemesi yaparsın.

Böylece `https://cdn.menuslide.com/stream/menuslide-tv10.m3u8` çalışır.

---

## Yol 3: Sadece Cloudflare (En Basit Deneme)

Gerçek bir yayın sunucun yoksa, sadece domain ve CDN’i hazırlarsın; stream’i sonra eklersin.

1. **Cloudflare** → menuslide.com (veya ilgili domain) → DNS.
2. **CNAME:** `cdn` → `menuslide.com` (veya geçici olarak başka bir hedef). Amaç: `cdn.menuslide.com` adresinin çözülmesi.
3. **SSL:** Full.
4. Daha sonra gerçek stream origin’i (Bunny, kendi nginx, vb.) bu CNAME’in hedefi yaparsın; path’i `/stream/{slug}.m3u8` olacak şekilde origin’de veya CDN rewrite ile ayarlarsın.

---

## MenuSlide Tarafında Kontrol

- Admin’de **Stream URL** alanı tam olarak: `https://cdn.menuslide.com/stream/menuslide-tv10.m3u8` (veya ilgili slug).
- Roku/Android TV bu URL’yi açar; 404 alırsa “placeholder” sayılıp ekran görüntüsü (render) moduna düşer. CDN’de bu path’te gerçekten HLS sunulduğunda video oynar.

---

## Özet Kontrol Listesi

- [ ] Stream kaynağı belirlendi (Bunny / Mux / nginx / vb.).
- [ ] HLS URL alındı veya üretildi (`.m3u8` + `.ts`).
- [ ] `cdn.menuslide.com` DNS’te tanımlı (CNAME → origin veya CDN).
- [ ] SSL açık (HTTPS).
- [ ] `/stream/{slug}.m3u8` path’i gerçek HLS playlist’e gidiyor.
- [ ] Admin’de ilgili ekranın Stream URL’si bu adresle kayıtlı.
- [ ] Roku’da kanal güncel; test edildi.

Bu adımlarla CDN ve HLS tarafını kurup `cdn.menuslide.com/stream/...` adresini kullanabilirsin.
