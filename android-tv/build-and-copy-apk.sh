#!/usr/bin/env bash
# Release APK üretir ve frontend/public/downloads/Menuslide.apk olarak kopyalar.
# Gereksinim: Java (JDK 17) ve Android SDK (ANDROID_HOME).
set -e
cd "$(dirname "$0")"
echo "Building release APK..."
./gradlew assembleRelease
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
  RELEASE_APK="app/build/outputs/apk/release/app-release.apk"
elif [ -f "app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
  RELEASE_APK="app/build/outputs/apk/release/app-release-unsigned.apk"
else
  echo "HATA: APK oluşmadı."
  exit 1
fi
DEST="../frontend/public/downloads/Menuslide.apk"
mkdir -p "$(dirname "$DEST")"
cp "$RELEASE_APK" "$DEST"
echo "Kopyalandı: $DEST"
echo "Ana sayfadan /downloads/Menuslide.apk indirilebilir."
