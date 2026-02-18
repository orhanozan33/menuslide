# Sitede APK indirmesi – ne yapmalı?

**APK** = Android’e kurulacak uygulama dosyası. Kullanıcılar bunu indirip Android TV / telefona yükler.

Sitede indirme linkinin çalışması için APK dosyasını aşağıdaki yollardan **birini** kullanın.

---

## APK yükleme adımları (Ayarlar üzerinden)

1. **Giriş:** Admin veya Süper Admin hesabıyla giriş yap.
2. **Ayarlar:** Sol menüden **Ayarlar** (Settings) sayfasına gir.
3. **Aşağı kaydır:** Sayfada **Fiyatlandırma**, **Stripe Ödeme** bölümlerinin **altına** in.
4. **TV uygulaması kartı:** **“Paramètres app TV Android” / “TV uygulaması (Android)”** başlıklı bölümde, içinde şunlar yazan büyük kutuyu bul:
   - API taban URL  
   - İndirme linki  
   - Watchdog  
   - (varsa) Uzaktan sürüm  
   En altta **“Düzenle →”** yazıyor.
5. **Kutuya tıkla:** Bu kutuya (veya “Düzenle →”e) tıkla. **TV uygulaması ayarları** penceresi (modal) açılır.
6. **APK yükle:** Açılan pencerede **“İndirme linki”** alanının hemen altında kısa bir açıklama ve **“APK yükle”** (veya “Menuslide.apk yükle”) butonu var. Bu butona tıkla.
7. **Dosya seç:** Açılan dosya seçme penceresinden **yeni derlediğin APK dosyasını** seç (örn. `Menuslide.apk` veya `Menuslide.1.0.28.apk`). **Aç** de.
8. **Bekle:** Yükleme bitene kadar bekle. Başarılı olursa yeşil bir “APK yüklendi / Sürüm bilgisi kaydedildi” mesajı çıkar.
9. **İndirme linki:** Pencerede **İndirme linki** alanı otomatik güncellenir (Supabase Storage adresi). İstersen **Kaydet** ile diğer TV ayarlarını da kaydedip kapat.

Bundan sonra sitedeki **“İndir”** linki bu yeni APK’yı gösterecek; kullanıcılar indirip TV’ye yükleyebilir.

---

## 1) Ayarlar üzerinden yükle (özet)

1. **Admin** olarak giriş yap.
2. **Ayarlar** sayfasına git.
3. Sayfayı aşağı kaydırıp **“TV uygulaması (Android)”** kartına tıkla.
4. Açılan pencerede **“APK yükle”** butonuna tıkla, derlediğin **Menuslide.apk** dosyasını seç.
5. Yükleme bitince indirme linki otomatik güncellenir (Supabase Storage’a yüklenir).

---

## 2) Projeye dosya koy (static)

1. Derlenen APK dosyasının adını **Menuslide.apk** yap.
2. Şu klasöre koy:
   ```
   frontend/public/downloads/Menuslide.apk
   ```
3. Projeyi deploy et (Vercel vb.).

Sitede indirme adresi: **https://SITE_ADRESI/downloads/Menuslide.apk** olur.

---

## Özet

| Yöntem | Ne yapıyorsun | Link nereden geliyor? |
|--------|----------------|------------------------|
| Ayarlar → APK yükle | Dosyayı seçip yüklüyorsun | Supabase Storage; Ayarlar’daki “İndirme linki” alanı |
| Static dosya | `frontend/public/downloads/Menuslide.apk` koyup deploy | `/downloads/Menuslide.apk` (site köküne göre) |

İndirmeleri sitede sunmak için bu iki yoldan birini kullanman yeterli.
