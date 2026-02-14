# Şu An Yapman Gerekenler (JSON Slide Sistemi)

Yeni mimari: Video/HLS yok, sadece JSON layout + Roku’da native slide. Adımlar:

---

## 1. Slide görsellerini nereden sunacağını belirle

API şu an şu URL’yi döndürüyor:
`{NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL veya NEXT_PUBLIC_CDN_BASE_URL}/slides/{screenId}/{templateId}.jpg`

**Seçenek A – CDN / object storage (önerilen)**  
- Bir bucket aç (DO Spaces, Cloudflare R2, Bunny, vb.).  
- Görselleri şu yapıda yükle: `slides/{screenId}/{templateId}.jpg`  
- Bucket’ı CDN ile yayına al.  
- Vercel (veya backend) env’e ekle:
  - `NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL=https://cdn.alanad.com` (kendi CDN adresin)

**Seçenek B – Mevcut screenshot worker’ı sadece “görsel” için kullan**  
- VPS’teki worker’ı video yerine tek kare screenshot alacak şekilde değiştir (veya ayrı bir “slide export” script’i yaz).  
- Ürettiğin JPG’leri CDN/bucket’a at; URL’ler yine `.../slides/{screenId}/{templateId}.jpg` formatında olsun.

**Yapman gereken:**  
- [ ] CDN/bucket URL’ini belirle  
- [ ] `NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL` (veya `NEXT_PUBLIC_CDN_BASE_URL`) değerini Vercel’de tanımla  
- [ ] En az bir ekran için görselleri `.../slides/{screenId}/{templateId}.jpg` olarak yükle

---

## 2. Backend’i deploy et

- [ ] Değişiklikleri push et (layout/register artık sadece JSON + slides)  
- [ ] Vercel’de env’i güncelle (`NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL`)  
- [ ] `GET https://menuslide.com/api/device/layout?deviceToken=dt_XXX_...` ile test et; dönen JSON’da `slides` içinde `url` alanları senin CDN adresinle dolu mu kontrol et

---

## 3. Roku kanalını güncelle ve yükle

- [ ] Projedeki güncel `roku-tv` (MainScene slides-only, video yok) ile paketle  
  - `roku-tv/package.sh` veya Roku CLI ile zip oluştur  
- [ ] Roku cihazına yükle (sideload veya mağaza)  
- [ ] Ekranı aç; Display Code ile aktivasyon yap  
- [ ] Layout geliyor mu, slide’lar (görsel/metin) dönüyor mu test et  

Eğer referans (minimal) Roku uygulamasını kullanacaksan:  
- [ ] `reference/digital-signage/roku/` içindeki kodu kendi kanal projenle birleştir; API base URL’i `https://menuslide.com/api` yap

---

## 4. (İsteğe bağlı) Eski video worker’ı kapat

- [ ] VPS’teki cron’da çalışan `scripts/legacy/vps-video-worker.js` (HLS/loop.mp4 üreten) artık gerekmiyorsa cron’u kaldır veya script’i durdur  
- [ ] Böylece sunucuda video encode yükü kalmaz

---

## 5. Hızlı test

1. Admin’de bir ekrana şablonlar ekle (template rotations), yayınla.  
2. O ekran için slide görsellerini CDN’e `slides/{screenId}/{templateId}.jpg` olarak koy (veya export script ile üret).  
3. Roku’da bu ekranın kodu ile aktivasyon yap.  
4. Roku’da slide’ların sırayla değiştiğini ve (varsa) metin slide’larının göründüğünü kontrol et.

---

## Özet

| Ne | Durum |
|----|--------|
| API (layout = JSON slides) | Projede hazır |
| Roku (slides only, video yok) | Projede hazır |
| **Senin yapacakların** | CDN URL’i env’e yaz, görselleri CDN’e koy, deploy et, Roku’yu güncelle, test et |

Görselleri henüz üretmiyorsan: Önce sadece **text** slide’larla test edebilirsin (API zaten `type: "text"` dönüyor; CDN olmadan da çalışır). Sonra CDN + image URL’leri ekleyebilirsin.
