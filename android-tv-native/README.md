# Digital Signage Native (No WebView)

Production-ready Android TV / Google TV / Fire TV app: **native layout engine + ExoPlayer**. No WebView, no HTML.

## Requirements

- **API:** `GET https://menuslide.com/api/display/{code}` returns JSON layout (see below).
- **Min SDK:** 24 | **Target SDK:** 34
- **Devices:** Android 7+, Chromecast with Google TV, Mi Stick, Fire Stick

## Build

```bash
# From project root, copy Gradle wrapper if needed:
cp -r ../android-tv/gradle . && cp ../android-tv/gradlew . && cp ../android-tv/gradlew.bat .

# Create local.properties with sdk.dir=/path/to/android-sdk

./gradlew assembleDebug   # debug APK
./gradlew assembleRelease # release APK (minify + ProGuard)
```

## JSON layout (API response)

```json
{
  "background": "#000000",
  "sections": [
    { "type": "video", "url": "https://...", "x": 0, "y": 0, "width": 1920, "height": 600 },
    { "type": "text", "value": "TITLE", "fontSize": 48, "color": "#ffffff", "x": 100, "y": 650 },
    { "type": "price", "value": "12.99", "currency": "$", "fontSize": 42, "color": "#00ff00", "x": 1600, "y": 650 }
  ],
  "refreshInterval": 60
}
```

- **refreshInterval:** seconds; app refetches JSON and re-renders without restart.
- **video:** ExoPlayer, looped, hardware-accelerated; auto-restart on error.
- **text / price:** native `TextView` with position and style.

## Project structure

- `app/src/main/java/com/digitalsignage/tv/signage/`
  - `MainActivity.kt` – code input, fullscreen, refresh loop
  - `App.kt` – Application
  - `api/` – Retrofit `DisplayApi`, `ApiModule`
  - `data/` – `DisplayConfig`, `Section` (Gson models)
  - `player/PlayerManager.kt` – ExoPlayer lifecycle, caching
  - `renderer/LayoutRenderer.kt` – builds views from JSON (video/text/price)

## Features

- No WebView; ConstraintLayout/FrameLayout + dynamic views
- ExoPlayer for video with buffer tuning and error restart
- Coroutines for API; Handler for periodic refresh
- Fullscreen immersive; back key exits playback to code screen
- ProGuard rules for ExoPlayer and Retrofit
- Last valid layout kept; retry every 10s on API failure
