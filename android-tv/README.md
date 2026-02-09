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

```bash
cd android-tv
./gradlew assembleRelease
```

APK: `app/build/outputs/apk/release/app-release-unsigned.apk`  
İmzalayıp ana sayfadaki indirme için **Menuslide.apk** adıyla kopyalayın:

```bash
cp app/build/outputs/apk/release/app-release.apk ../frontend/public/downloads/Menuslide.apk
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

- **API adresi:** `MainActivity.kt` içinde `API_BASE`
- **Kod / deviceId:** Uygulama içinde SharedPreferences ile saklanır

## Notlar

- WebView kullanılmaz; Firebase/Play Services yok
- Kurumsal / release kullanım için uygundur
