# TV’de yeni logo görünmüyorsa

Yeni logo (MenuSlide Canada + Roku ikonları) sadece **bu projeden yeni derlenen APK** ile gelir. Eski APK veya başka yerden alınan build’de eski logo kalır.

## Masaüstü / launcher ikonu

Uygulama ikonu **logo_menuslide_canada** drawable'ını kullanır. Logo görünmesi için **android-tv/app/src/main/res/drawable/** içinde **logo_menuslide_canada.png** olmalı. Yeni APK kurduktan sonra ikon bazen güncellenmez: uygulamayı kaldırıp tekrar kurun veya cihazı yeniden başlatın.

## 1. Güncel kodu al

```bash
cd /Users/admin/Desktop/Tvproje
git pull
```

Yeni logo ve drawable’lar bu repoda; başka klasörden build alıyorsan orada bu dosyalar yoksa logo güncellenmez.

## 2. APK’yı bu projeden derle

```bash
./scripts/setup-and-build-android-apk.sh
```

Bu script **android-tv** modülünü derler (içinde logo_menuslide_canada ve yeni ikonlar var).  
Çıkan dosya: **frontend/public/downloads/Menuslide.apk**

Bu dosyayı kullan. Başka bir bilgisayarda / eski bir Menuslide.1.0.xx.apk ile kurulum yapma.

## 3. TV’de eski uygulamayı kaldır

- TV’de: **Ayarlar → Uygulamalar → Menuslide (Digital Signage)** → **Kaldır** / **Uninstall**
- Veya ADB ile (TV bağlıyken):  
  `adb uninstall com.digitalsignage.tv`

Eski sürümü kaldırmadan yeni APK’yı “güncelleme” ile kurduğunda bazen eski kaynaklar (logo) önbellekte kalabiliyor.

## 4. Yeni APK’yı kur

- **Aynı APK:** `frontend/public/downloads/Menuslide.apk` (script’in kopyaladığı)
- ADB: `adb install -r frontend/public/downloads/Menuslide.apk`  
  veya  
  `./scripts/install-android-tv-apk.sh`
- Ya da bu dosyayı USB belleğe atıp TV’de dosya yöneticisi ile kur.

## 5. Hâlâ eski logo varsa

- TV’de uygulamayı **tamamen kaldır**, TV’yi **yeniden başlat**, sonra sadece yeni derlenen **Menuslide.apk**’yı tekrar kur.
- Kullandığın APK’nın **tarihini** kontrol et: Script’i çalıştırdıktan hemen sonra `frontend/public/downloads/Menuslide.apk` dosyasının “Değiştirilme” tarihi bugün olmalı.

---

## "For input string" hatası

Kod girişi (giriş) sırasında bu hata oluşuyorsa, API bazen sayı yerine string gönderiyordur. Projede iki düzeltme yapıldı:

1. **Layout version:** Sunucu `layout.version` alanını string gönderdiğinde uygulama artık çökmüyor.
2. **refreshIntervalSeconds:** Kayıt yanıtında bu alan string gelirse güvenli parse ediliyor.
3. **tv-app-config API:** `minVersionCode` / `latestVersionCode` her zaman sayı olarak dönüyor.

Bu değişikliklerin hepsi **yeni derlenen APK** içinde. Eski APK’yı kullanmaya devam edersen hata sürebilir. **Bu repodan yeni build alıp o APK’yı kur.**

---

Özet: **Yeni logo = bu repodan güncel kod + aynı repodan alınan build + TV’de eski sürümü kaldırıp bu APK’yı kurmak.** **For input string = aynı şekilde en son kodu çek, build al, o APK’yı kur.**
