# TV Yayın Kodu – Adım Adım Kurulum

Bu rehber, ekranlarınıza yayın kodu atayıp Android TV uygulamasında kodu girerek yayını açmanızı adım adım anlatır.

---

## 1. Veritabanında yayın kodu ve TV ayarları

### 1.1 Supabase’de migration çalıştırma

1. **Supabase Dashboard**’a girin: https://supabase.com/dashboard → projenizi seçin.
2. Sol menüden **SQL Editor** → **New query**.
3. Şu dosyanın içeriğini açıp **tamamını** kopyalayın:  
   `database/migration-supabase-tv-app.sql`
4. SQL Editor’e yapıştırıp **Run** (veya Ctrl+Enter) ile çalıştırın.

Bu script:

- `screens` tablosuna **broadcast_code** sütununu ekler.
- Mevcut ekranlara otomatik 5 haneli kod atar (10000, 10001, 10002, …).
- **tv_app_settings** tablosunu oluşturur (API adresi, APK indirme linki vb.).

Hata almazsanız bu adım tamamdır.

---

## 2. Canlı sitenin (API) adresi

TV uygulaması, yayın kodunu göndermek için sitenizin **API proxy** adresini kullanır.

- Site adresiniz **https://menuslide.com** ise API taban adresiniz:  
  **https://menuslide.com/api/proxy**
- Kendi domain’iniz varsa: **https://siteniz.com/api/proxy**  
  (Sonunda `/` olmasın.)

Bu adresi bir sonraki adımda admin panelde gireceksiniz.

---

## 3. Admin panelde TV / API ayarları

1. **Menü Slide** sitesine giriş yapın (admin veya süper admin).
2. Sol menüden **Ayarlar** sayfasına gidin.
3. **TV uygulaması** bölümünü bulun.
4. **API taban URL** alanına yazın:
   - `https://menuslide.com/api/proxy`  
   veya kendi domain’inizle  
   - `https://siteniz.com/api/proxy`
5. **Kaydet** ile ayarı kaydedin.

TV uygulaması ilk açılışta bu adresten config alır; böylece kod girişi doğru API’ye gider.

---

## 4. Ekranlarda yayın kodunu görme ve kopyalama

1. Sol menüden **Ekranlar** sayfasına gidin.
2. Her TV kartında **“TV uygulaması yayın kodu”** kutusunu görürsünüz.
3. **Kod atanmışsa** (örn. 10001): kodu ve **Kodu kopyala** butonunu kullanın.
4. **“Atanmamış”** yazıyorsa: **Düzenle** linkine tıklayıp o ekranın detay sayfasına gidin; orada yayın kodunu atayıp kaydedin.

Hangi TV’nin hangi koda ait olduğu bu listeden belli olur (TV5 → 10005, TV10 → 10010 gibi).

---

## 5. Android TV uygulamasını derleme ve kurma

### 5.1 Gereksinimler

- Bilgisayarınızda **Java JDK 17** ve **Android SDK** kurulu.
- Ortam değişkeni: **ANDROID_HOME** = Android SDK klasörü.

### 5.2 İmzalı APK üretme (önerilen)

1. Proje kökünde:
   ```bash
   cd android-tv
   ```
2. Keystore yoksa (ilk kez):
   ```bash
   ../scripts/create-android-keystore.sh
   ```
3. İmzalı release APK:
   ```bash
   ./gradlew assembleRelease
   ```
4. APK konumu:  
   `android-tv/app/build/outputs/apk/release/app-release.apk`  
   (veya keystore ile üretilen imzalı APK.)

### 5.3 TV’ye kurma

- APK’yı USB ile veya ağ üzerinden TV/Stick’e atıp yükleyin.
- İsterseniz **Ayarlar** sayfasından yüklediğiniz APK’yı Supabase Storage’a koyup indirme linkini “TV uygulaması indirme” alanına yazabilirsiniz; kullanıcılar ana sayfadaki indirme linkiyle de alabilir.

---

## 6. TV uygulamasında kod girip yayını başlatma

1. TV’de **MenuSlide TV** uygulamasını açın.
2. **Yayın Kodu** alanına, admin panelde gördüğünüz 5 haneli kodu girin (örn. 10001).
3. **Başlat** butonuna basın (veya klavyede Enter/Done).

Uygulama:

- Önce **https://menuslide.com/api/tv-app-config** (veya sizin domain) üzerinden API taban adresini alır.
- Sonra **POST …/api/proxy/player/resolve** ile kodu gönderir; sunucu o koda ait ekranın yayın URL’ini döner.
- Gelen URL’deki yayını tam ekran açar.

Kod doğruysa yayın açılır; yanlışsa “Geçersiz yanıt. Kodu kontrol edin.” benzeri bir mesaj görürsünüz.

---

## 7. Sorun giderme (kısa kontrol listesi)

| Sorun | Kontrol |
|--------|--------|
| Kod girildi, giriş yapılmadı | Ayarlar’da **API taban URL** doğru mu? (https://menuslide.com/api/proxy) |
| 404 – Sayfa bulunamadı | `/api/proxy` tek başına sayfa değil; uygulama **/api/proxy/player/resolve** kullanmalı. Tarayıcıda test için **/api/proxy** artık 200 döner. |
| Ekranlarda yayın kodu görünmüyor | Migration çalıştı mı? Ekranlar sayfasını yenileyin. |
| Kod “Atanmamış” | Migration’ı çalıştırın veya ilgili ekranın detay sayfasından yayın kodunu atayın. |

---

## Özet akış

1. **Supabase:** `migration-supabase-tv-app.sql` çalıştır → broadcast_code + tv_app_settings.
2. **Admin → Ayarlar:** API taban URL = `https://menuslide.com/api/proxy` (veya kendi domain) → Kaydet.
3. **Admin → Ekranlar:** Her TV’nin yayın kodunu gör/kopyala.
4. **TV uygulaması:** APK’yı derleyip kur → Uygulamada 5 haneli kodu gir → Başlat.

Bu adımlarla hangi TV’nin hangi kodla açılacağı netleşir ve kod girişi doğru API’ye gider.
