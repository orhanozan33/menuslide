# MenuSlide TV – Android TV / Fire Stick Video Player

Production-ready Android TV uygulaması: tek seferlik yayın kodu girişi, API ile stream URL çözümleme, ExoPlayer ile tam ekran HLS/MP4 oynatma. Google Play Services kullanılmaz.

## Özellikler

- **Tek ekran:** Kod yoksa büyük input + “Başlat”; kod varsa doğrudan yayın
- **API:** `POST https://api.menuslide.com/player/resolve` → `{ "streamUrl": "..." }`
- **ExoPlayer (Media3):** HLS/MP4 tam ekran, ağ kopunca otomatik tekrar bağlanma
- **Kalıcı kod:** SharedPreferences; TV kapanıp açılınca aynı yayın otomatik başlar
- **deviceId:** İlk açılışta UUID oluşturulup saklanır, API isteğinde gönderilir

## Gereksinimler

- Min SDK 21 (Android 5.0), Target SDK 34
- Android TV / Android Stick / Amazon Fire Stick
- Landscape, Internet izni

## Proje yapısı

```
android-tv/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/.../MainActivity.kt
│   │   └── res/
│   │       ├── layout/activity_main.xml
│   │       └── values/strings.xml
│   ├── build.gradle
│   └── proguard-rules.pro
├── build.gradle
└── settings.gradle
```

## Derleme ve APK

**Tek komut (APK üretir ve web indirme klasörüne kopyalar):**
```bash
cd android-tv
./build-and-copy-apk.sh
```
*(Java JDK 17 ve Android SDK gerekli; ANDROID_HOME tanımlı olmalı.)*

Veya adım adım:
```bash
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release-unsigned.apk ../frontend/public/downloads/Menuslide.apk
```

Ana sayfa “İndir” butonu `/downloads/Menuslide.apk` dosyasına link verir.

## API örneği

**İstek:**

```http
POST https://api.menuslide.com/player/resolve
Content-Type: application/json

{ "code": "ABC123", "deviceId": "uuid" }
```

**Yanıt:**

```json
{ "streamUrl": "https://cdn.menuslide.com/live/stream.m3u8" }
```

## Konfigürasyon

- **API adresi:** Uygulama açılışta `https://menuslide.com/api/tv-app-config` üzerinden alır; Ayarlar’da “API taban URL” kaydedilir.
- **Kod / deviceId:** Uygulama içinde SharedPreferences ile saklanır

## Masaüstü ikonu (launcher logo)

Kurulumdan sonra TV/cihaz ana ekranında görünen ikon: `app/src/main/res/mipmap-*/ic_launcher.png`. Kendi logonuzu (MenuSlide) göstermek için bu dosyaları logonuzla değiştirin (önerilen boyutlar: mdpi 48×48, hdpi 72×72, xhdpi 96×96, xxhdpi 144×144, xxxhdpi 192×192 px).

## Notlar

- WebView kullanılmaz; Firebase/Play Services yok
- Kurumsal / release kullanım için uygundur
