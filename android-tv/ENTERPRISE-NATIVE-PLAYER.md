# Enterprise Digital Signage – Native TV Player

**WebView yok.** Tamamen native: ConstraintLayout/FrameLayout + ExoPlayer. 1GB RAM stick’ler için optimize.

## Mimari

- **Activation:** İlk açılışta Display Code ister → `POST https://menuslide.com/api/device/register` → deviceToken + layout JSON alır; token EncryptedSharedPreferences’ta saklanır.
- **Layout engine:** JSON layout parse edilir; Text, Image, Video, Price bileşenleri native View (TextView, ImageView, FrameLayout + ExoPlayer) ile çizilir.
- **Video:** Tek ExoPlayer instance; cache destekli; hata durumunda otomatik retry.
- **Offline:** Son layout Room’da; medya internal cache’te; API erişilemezse offline devam.
- **Background sync:** WorkManager ile periyodik layout/config güncellemesi.
- **Heartbeat:** 60 sn’de bir `POST /api/device/heartbeat` (deviceToken, RAM, playback status, app version).
- **Kiosk:** Fullscreen, boot’ta otomatik başlama (BootReceiver).

## Proje yapısı

```
app/src/main/java/com/digitalsignage/tv/
  TvApplication.kt          # Hilt + WorkManager config
  MainActivity.kt           # Kiosk playback, layout render
  activation/
    ActivationActivity.kt
    ActivationViewModel.kt
  data/
    api/ApiService.kt       # Retrofit: register, heartbeat
    local/
      AppDatabase.kt
      DeviceDao.kt, DeviceEntity.kt
      LayoutCacheDao.kt, LayoutCacheEntity.kt
      CacheManager.kt       # Medya cache, checksum
    repository/DeviceRepository.kt
  di/
    AppModule.kt, DatabaseModule.kt, LayoutModule.kt
  layout/LayoutRenderer.kt  # JSON → native View
  player/PlayerManager.kt   # Tek ExoPlayer
  receiver/BootReceiver.kt
  service/HeartbeatService.kt
  worker/SyncWorker.kt      # WorkManager HiltWorker
```

## Backend API (Vercel)

- `POST /api/device/register` — Body: `{ displayCode, deviceId, deviceModel?, osVersion? }`. Yanıt: `{ deviceToken, layout?, videoUrls?, refreshIntervalSeconds }`. Layout: `{ version, backgroundColor, components: [{ type, x, y, width, height, zIndex, videoUrl?, imageUrl?, text?, textColor?, textSize? }] }`.
- `POST /api/device/heartbeat` — Body: `{ deviceToken, ramUsageMb?, playbackStatus?, appVersion?, lastError? }`. Yanıt: `{ ok: true }`.

## Derleme

```bash
cd android-tv
./gradlew assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

Sürüm adı ile kopyalamak için:

```bash
./build-and-copy-apk.sh
# Menuslide.1.0.15.apk + Menuslide.apk → frontend/public/downloads/
```

## Fire OS / düşük bellek

- Min SDK 24; tek ExoPlayer; foreground service ile kısmen koruma.
- Proguard/R8 açık; Hilt + Room + WorkManager kullanılıyor.
- WorkManager on-demand init için manifest’te `WorkManagerInitializer` kaldırıldı.

## Güvenlik

- HTTPS only (`usesCleartextTraffic="false"`).
- deviceToken EncryptedSharedPreferences ile saklanıyor.
- Certificate pinning istenirse OkHttp interceptor eklenebilir.
