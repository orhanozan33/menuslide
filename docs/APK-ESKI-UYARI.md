# Neden hâlâ eski logo ve "For input string" hatası?

## Sebep

Yüklediğin **frontend/public/downloads/Menuslide.apk** dosyası **11 Şubat 2026** tarihli.  
Yeni logo ve "For input string" düzeltmeleri **18 Şubat sonrası** projeye eklendi. Yani şu an sitede / TV’de kullandığın APK **eski build**; bu yüzden:

- Eski logo görünüyor
- Kod girişinde "For input string" hatası çıkıyor

## Ne yapmalısın?

### 1. Yeni APK üret (kendi bilgisayarında)

Proje kökünde:

```bash
cd /Users/admin/Desktop/Tvproje
git pull
./scripts/setup-and-build-android-apk.sh
```

- Build **başarılı** olursa **yeni** `frontend/public/downloads/Menuslide.apk` oluşur (tarih bugün olur).
- Build **bu ortamda** (Cursor/CI) Gradle hatası veriyor; bu yüzden APK’yı **kendi makinede** derlemen gerekiyor (Java 17 + Android SDK kurulu olmalı).

### 2. Yeni APK’yı yükle

- **Admin → Ayarlar** → sayfayı aşağı kaydır → **TV uygulaması (Android)** kutusuna tıkla.
- Açılan pencerede **APK yükle** → az önce derlediğin **Menuslide.apk** dosyasını seç (proje içindeki `frontend/public/downloads/Menuslide.apk` – build’den hemen sonra güncel olandır).

### 3. TV’de güncelle

- TV’de uygulamayı **kaldır**, sonra siteden **yeni yüklediğin APK**yı indirip kur; veya doğrudan yeni APK’yı TV’ye atıp kur.

## Özet

| Kullandığın dosya | Sonuç |
|-------------------|--------|
| Eski Menuslide.apk (örn. 11 Şubat) | Eski logo, "For input string" hatası |
| **Yeni** build’den çıkan Menuslide.apk | Yeni logo, hata düzeltmeleri |

**Yüklediğin APK eski; önce bu projeden yeni build al, çıkan Menuslide.apk’yı yükle.**
