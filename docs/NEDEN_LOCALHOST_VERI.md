# Canlıda Neden Hâlâ Localhost’a İstek Gidiyor?

İki sebep olabilir:

---

## 1) Sayfayı localhost’ta açıyorsun

Tarayıcıda **http://localhost:3000** açıksa, tüm istekler (`/api/public-screen/...`, `/api/proxy/...`) **localhost:3000**’e gider. Bu normal: adres “aynı origin” olduğu için relative URL’ler (`/api/...`) hep localhost’a çıkar.

**Yapman gereken:** Canlıyı test ederken adres çubuğunda **https://menuslide.com** (veya Vercel URL’in) açık olsun. Local’i kapatıp sadece menuslide.com’u aç.

---

## 2) Canlı kanallar verisinde localhost linkleri vardı

**data/home-channels.json** içinde `http://localhost:3000/display/...` linkleri vardı. Bu dosya düzeltildi: artık **relative** link kullanılıyor (`/display/metro-tv1` vb.). Ana sayfadaki iframe adresi zaten `window.location.origin` ile üretildiği için canlıda menuslide.com olur.

Eğer kanallar **Supabase**’deki `home_channels` tablosundan geliyorsa ve orada hâlâ localhost linkleri varsa:

- Admin panelinden **Ayarlar** → Canlı Kanallar bölümünde linkleri **/display/metro-tv1** gibi relative (veya tam **https://menuslide.com/display/metro-tv1**) yap,
- veya Supabase **SQL Editor**’de:

```sql
UPDATE home_channels SET link = '/display/' || TRIM(TRAILING '/' FROM REPLACE(link, 'http://localhost:3000', '')) WHERE link LIKE '%localhost%';
```

---

## Özet

| Durum | Çözüm |
|--------|--------|
| Tarayıcıda localhost:3000 açık | Canlı test için **menuslide.com** aç; localhost’u kapat. |
| Kanallar localhost link içeriyor | **data/home-channels.json** güncellendi. DB’de varsa yukarıdaki SQL veya panelden düzelt. |

Canlıda doğru test: **Sadece https://menuslide.com** açıp orada dene.
