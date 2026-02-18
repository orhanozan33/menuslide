# Android TV APK Derleme ve Yükleme

## 1. APK derleme (bilgisayarınızda)

### Gereksinimler
- **Java 17** (veya 18/21)  
  macOS: `brew install openjdk@17`  
  Sonra: `export JAVA_HOME="/opt/homebrew/opt/openjdk@17"` (veya kurulum yolunuza göre)
- **Android SDK**  
  - Ya **Android Studio** kurun: https://developer.android.com/studio  
  - Ya komut satırı: `brew install --cask android-commandlinetools`  
  - `ANDROID_HOME` tanımlı olmalı (örn. `~/Library/Android/sdk` veya ` /usr/local/share/android-commandlinetools`)

### Tek komutla derleme (önerilen)
Proje kökünde:
```bash
./scripts/setup-and-build-android-apk.sh
```
Bu script Java ve SDK kontrol eder; Release APK’yı derleyip `frontend/public/downloads/Menuslide.apk` konumuna kopyalar.

### Manuel derleme
```bash
# Release APK (yayın için)
cd android-tv
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"   # veya kendi Java yolunuz
./gradlew assembleRelease
```
APK çıktısı: `android-tv/app/build/outputs/apk/release/app-release.apk`

Debug APK (test için):
```bash
./gradlew assembleDebug
```
Çıktı: `android-tv/app/build/outputs/apk/debug/app-debug.apk`

---

## 2. APK’yı Android TV / cihaza yükleme

### A) USB ile (ADB)
1. Android TV’de **Ayarlar → Cihaz tercihleri → Güvenlik ve kısıtlamalar** içinde **Bilinmeyen kaynaklardan uygulama yükleme** (veya **Geliştirici seçenekleri → USB hata ayıklama**) açın.
2. TV ile bilgisayarı aynı ağda tutun veya USB ile bağlayın (USB hata ayıklama açıksa).
3. Bilgisayarda:
   ```bash
   adb devices
   adb install -r /path/to/app-release.apk
   ```
   `-r` = varsa üzerine yükle (güncelleme). İlk kurulumda `-r` olmadan da kullanabilirsiniz.

### B) Ağ üzerinden ADB (Wi‑Fi)
1. TV’de USB hata ayıklama açık olsun; önce bir kez USB ile `adb tcpip 5555` yapın.
2. TV’nin IP’sini öğrenin (Ayarlar → Ağ).
3. Bağlanın ve yükleyin:
   ```bash
   adb connect TV_IP_ADRESI:5555
   adb install -r app-release.apk
   ```

### C) Dosya paylaşımı / USB bellek
1. APK’yı USB belleğe veya ağ paylaşımına kopyalayın.
2. Android TV’de bir **Dosya Yöneticisi** veya **X-plore** gibi uygulama ile APK dosyasına gidin.
3. APK’ya tıklayın; “Bilinmeyen kaynaklardan yükleme” izni verin ve kurun.

### D) İndirme sayfası (kullanıcılar için)
APK’yı `frontend/public/downloads/Menuslide.apk` konumuna koyarsanız, site üzerinden indirme linki verilebilir. Kullanıcı APK’yı indirip yukarıdaki (C) yöntemiyle veya ADB ile cihaza yükleyebilir.

---

## 3. Özet kontrol listesi
- [ ] Java 17 kurulu, `JAVA_HOME` ayarlı
- [ ] Android SDK kurulu, `ANDROID_HOME` ayarlı
- [ ] `./scripts/setup-and-build-android-apk.sh` veya `cd android-tv && ./gradlew assembleRelease` ile APK üretildi
- [ ] TV’de bilinmeyen kaynaklardan yükleme (ve gerekiyorsa USB hata ayıklama) açık
- [ ] ADB ile `adb install -r app-release.apk` veya dosya yöneticisi ile APK kuruldu
