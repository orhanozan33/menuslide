# APK Nerede? Yükleme ve Yayınlama Adımları

## 1. APK nerede?

### Derleme sonrası (bilgisayarınızda)

| Konum | Açıklama |
|-------|----------|
| `android-tv/app/build/outputs/apk/release/app-release.apk` | Her `./gradlew assembleRelease` veya `./build-and-copy-apk.sh` sonrası oluşan release APK. |
| `frontend/public/downloads/Menuslide.apk` | Script çalıştığında kopyalanan “güncel” sürüm (indirme linki hep aynı kalsın diye). |
| `frontend/public/downloads/Menuslide.1.0.15.apk` | Sürüm numaralı kopya (ör. 1.0.15). |

### APK üretmek için

```bash
cd android-tv
./gradlew assembleRelease
```

APK yolu: **`android-tv/app/build/outputs/apk/release/app-release.apk`**

Sürüm adıyla kopyalamak ve `downloads` klasörüne almak için:

```bash
cd android-tv
./build-and-copy-apk.sh
```

Bu komut hem `Menuslide.1.0.XX.apk` hem de `Menuslide.apk` dosyalarını `frontend/public/downloads/` içine kopyalar.

---

## 2. Yükleme adımları (APK’yı sisteme vermek)

1. **Admin panele girin**  
   Site adresinizle giriş yapın (örn. https://menuslide.com).

2. **Ayarlar sayfasına gidin**  
   Sol menüden **Ayarlar**’ı seçin.

3. **“Android TV Uygulaması Ayarları” bölümünü bulun**  
   Aşağı kaydırıp TV uygulaması kısmına gelin.

4. **APK’yı yükleyin**  
   - **“APK’yı depolamaya yükle”** veya **“APK yükle”** ile `app-release.apk` dosyasını seçin.  
   - Dosya: `android-tv/app/build/outputs/apk/release/app-release.apk`  
   - Veya script çalıştırdıysanız: `frontend/public/downloads/Menuslide.apk`  
   - Yükleme tamamlanınca indirme linki (Supabase Storage) ve sürüm bilgisi (versionCode / versionName) otomatik kaydedilir.

5. **Kaydet**  
   Gerekirse **Kaydet** butonuna basın. Böylece TV uygulaması “güncel sürüm” olarak bu APK’yı kullanır; güncelleme uyarısı bu sürüme göre çalışır.

---

## 3. Yayınlama adımları (TV’de kurup yayını açmak)

### A) TV / stick’e APK kurulumu

- **İlk kurulum:**  
  APK’yı USB ile veya indirme linki ile cihaza atıp yükleyin.  
  İndirme linki: **Siteniz/downloads/Menuslide.apk** (örn. https://menuslide.com/downloads/Menuslide.apk).

- **Güncelleme:**  
  Uygulama açıldığında “Güncelleme var” çıkarsa **Güncelle** ile indirip kurun; veya yeni APK’yı elle yükleyin.

### B) Ekran (yayın) kodu

1. **Admin → Ekranlar** sayfasına gidin.
2. İlgili ekranı seçin (veya yeni ekran oluşturun).
3. **“TV uygulaması yayın kodu”** (5 haneli, örn. 10012) veya **public_slug** / **public_token** değerini not alın.  
   Enterprise native uygulama bunu **Display Code** olarak kullanır.

### C) TV’de uygulamayı çalıştırma

1. TV veya stick’te **MenuSlide TV** uygulamasını açın.
2. **İlk açılışta:**  
   - “Display Code” (veya “Yayın Kodu”) istenecek.  
   - Admin’de not aldığınız **5 haneli kodu** aynen girin.  
   - **Activate / Başlat**’a basın.
3. Aktivasyon başarılıysa uygulama otomatik yayın ekranına geçer; layout (metin/video) cache’ten veya sunucudan yüklenir.
4. **Sonraki açılışlarda:**  
   Kod kayıtlı olduğu için doğrudan yayın ekranı açılır (veya güncelleme uyarısı çıkar).

### D) Yayının görünmesi

- **Native player:** Layout JSON’a göre metin, resim, video (ExoPlayer) gösterilir.  
- **Backend:** `POST /api/device/register` ile aktivasyon; `POST /api/device/heartbeat` ile sağlık sinyali gider.  
- İnternet kesilirse son cache’lenmiş layout ve medya ile **offline** devam eder.

---

## 4. Özet tablo

| Adım | Ne yapılır |
|------|-------------|
| APK konumu | `android-tv/app/build/outputs/apk/release/app-release.apk` |
| Yükleme | Admin → Ayarlar → Android TV → APK yükle → Kaydet |
| İndirme linki | https://siteniz.com/downloads/Menuslide.apk |
| Yayın kodu | Admin → Ekranlar → ilgili ekran → “TV uygulaması yayın kodu” (5 hane) |
| TV’de | Uygulamayı aç → Display Code gir → Activate → Yayın başlar |

Bu adımlarla APK’yı nerede bulacağınız, nasıl yükleyeceğiniz ve nasıl yayın açacağınız tek dokümanda toplanmış olur.
