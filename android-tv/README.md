# Android TV App - Digital Signage Display

A WebView-based Android TV application for displaying digital signage menus.

## Overview

This Android TV app loads the public display URL in a WebView, providing a native TV experience with:
- Fullscreen display
- Auto-reload on connection loss
- TV-optimized navigation
- Offline handling

## Project Structure

```
android-tv/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/digitalsignage/tv/
│   │   │   │   └── MainActivity.kt
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   │   └── activity_main.xml
│   │   │   │   └── values/
│   │   │   │       └── strings.xml
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── build.gradle
├── build.gradle
├── settings.gradle
└── README.md
```

## Setup Instructions

1. **Open in Android Studio**
   - Open Android Studio
   - Select "Open an existing project"
   - Navigate to the `android-tv` directory

2. **Configure Display URL**
   - Edit `MainActivity.kt`
   - Update `DISPLAY_URL` constant with your screen's public token URL
   - Format: `https://your-domain.com/display/{public_token}`

3. **Build and Deploy**
   - Connect Android TV device or emulator
   - Build and run the app
   - The app will launch in fullscreen mode

## Features

- **WebView Display**: Loads the web-based menu display
- **Fullscreen**: Automatically enters fullscreen mode
- **Auto-reload**: Detects connection loss and reloads
- **TV Optimized**: Designed for TV remote navigation

## Future Enhancements

- [ ] Offline caching
- [ ] Push notifications for updates
- [ ] Custom TV launcher integration
- [ ] Performance optimizations
- [ ] Analytics integration
- [ ] Remote configuration

## Requirements

- Android TV device or emulator
- Android SDK 21+ (Android 5.0 Lollipop)
- Internet connection

## Configuration

The app can be configured by modifying constants in `MainActivity.kt`:

- `DISPLAY_URL`: The public display URL
- `RELOAD_INTERVAL`: Auto-reload interval in milliseconds
- `CONNECTION_CHECK_INTERVAL`: Network check interval

## Building

```bash
./gradlew assembleDebug
```

## Installation

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Notes

- The app requires internet connection to load menu content
- WebView settings are optimized for TV display
- JavaScript is enabled for dynamic content
- DOM storage is enabled for caching
