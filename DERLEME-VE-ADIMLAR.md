# Derleme ve Sonraki Adımlar

## Yapılan temizlik (VLC / stream_url kaldırıldı)

- **Backend:** `stream_url` artık kullanılmıyor; `/player/resolve` her zaman web display URL döndürüyor. PATCH ekran güncellemesinde `stream_url` kabul edilmiyor.
- **Admin:** Ekran listesi ve ekran detay sayfasındaki "VLC için link / Yayın linki (VLC)" alanları kaldırıldı.
- **Veritabanı:** Yeni kurulumlar için `migration-tv-app-required.sql` içinde `stream_url` sütunu eklenmiyor. Eski `migration-add-stream-url.sql` ve `android-tv/TV-STICK-VLC-VE-TARAYICI.md` dosyaları silindi.

TV stick optimizasyonları (ultralow/lite/low) aynen duruyor; sadece VLC/stream URL özelliği kaldırıldı.

---

## Uygulamayı derleme

1. **Android TV APK:**
   ```bash
   cd android-tv
   ./build-and-copy-apk.sh
   ```
   - Release APK üretilir, `versionCode` otomatik artar.
   - APK şuraya kopyalanır: `frontend/public/downloads/Menuslide.apk`

2. **Sadece derleyip kopyalamak istemezseniz:**
   ```bash
   cd android-tv
   ./gradlew assembleRelease
   ```
   APK: `android-tv/app/build/outputs/apk/release/app-release.apk`

---

## Sonraki adımlar (dağıtım)

1. **Sunucuya APK yükleyin**  
   Admin → Ayarlar → TV uygulaması → APK yükle → `frontend/public/downloads/Menuslide.apk` (veya release klasöründeki APK) → Kaydet. Böylece sunucudaki `latest_version_code` güncellenir.

2. **Stick’e kurulum**  
   - Yeni kurulum: APK’yı USB veya indirme linki ile cihaza atıp yükleyin.  
   - Güncelleme: Uygulama açıldığında “Güncelleme var” çıkarsa Güncelle ile kurun.

3. **Yayın kodu**  
   Admin → Ekranlar’da ilgili ekranın “TV uygulaması yayın kodu” (5 haneli) görünür. Stick’te uygulamayı açıp bu kodu girin; yayın web sayfası (display URL) açılır.

---

## Sorun giderme: "Kodu girdim, uygulama kapandı"

Bu durum genelde TV/stick'te WebView veya bellek baskısından kaynaklanır. Yapılan iyileştirmeler:

- **Gecikmeli WebView yükleme:** Sayfa, kod doğrulandıktan ~0,5 sn sonra yükleniyor; UI önce yerleşiyor, çökme riski azalıyor.
- **Donanım hızlandırma kapatıldı:** Activity için `hardwareAccelerated="false"`; zayıf GPU'lu cihazlarda WebView daha stabil.
- **Hata yakalama:** Beklenmeyen hatalarda mümkünse tekrar koda dönüp hata mesajı gösteriliyor.

**Siz yapabilecekleriniz:** (1) Bu değişikliklerle yeni APK derleyip stick'e kurun. (2) Kodu tekrar girin; bazen ikinci denemede açılır. (3) Stick internet bağlantısı ve Admin'deki 5 haneli kodu kontrol edin.

Detaylı kullanım: `android-tv/KULLANIM-ADIMLAR.md`
