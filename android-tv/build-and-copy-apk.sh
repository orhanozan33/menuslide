#!/usr/bin/env bash
# Release APK üretir; sürüm adı ile (Menuslide.1.0.14.apk) ve Menuslide.apk olarak kopyalar.
# Her build'de version.properties içindeki versionCode otomatik artar.
# Gereksinim: Java (JDK 17) ve Android SDK (ANDROID_HOME).
set -e
cd "$(dirname "$0")"

VERSION_FILE="version.properties"
VERSION_NAME=""
if [ -f "$VERSION_FILE" ]; then
  if grep -q '^versionCode=' "$VERSION_FILE"; then
    code=$(grep '^versionCode=' "$VERSION_FILE" | cut -d= -f2)
    next=$((code + 1))
    versionName="1.0.$next"
    sed "s/^versionCode=.*/versionCode=$next/" "$VERSION_FILE" > "${VERSION_FILE}.tmp" && mv "${VERSION_FILE}.tmp" "$VERSION_FILE"
    if grep -q '^versionName=' "$VERSION_FILE"; then
      sed "s/^versionName=.*/versionName=$versionName/" "$VERSION_FILE" > "${VERSION_FILE}.tmp" && mv "${VERSION_FILE}.tmp" "$VERSION_FILE"
    else
      echo "versionName=$versionName" >> "$VERSION_FILE"
    fi
    VERSION_NAME="$versionName"
    echo "Version: versionCode $code -> $next, versionName=$versionName"
  fi
fi
# Build sonrası sürüm adını oku (güncel versionName)
if [ -z "$VERSION_NAME" ] && [ -f "$VERSION_FILE" ]; then
  VERSION_NAME=$(grep '^versionName=' "$VERSION_FILE" | cut -d= -f2 | tr -d ' ')
fi
if [ -z "$VERSION_NAME" ]; then
  VERSION_NAME="1.0.0"
fi

echo "Building release APK..."
./gradlew assembleRelease
RELEASE_DIR="app/build/outputs/apk/release"
if [ -f "$RELEASE_DIR/Menuslide.${VERSION_NAME}.apk" ]; then
  RELEASE_APK="$RELEASE_DIR/Menuslide.${VERSION_NAME}.apk"
elif [ -f "$RELEASE_DIR/app-release.apk" ]; then
  RELEASE_APK="$RELEASE_DIR/app-release.apk"
else
  RELEASE_APK=$(find "$RELEASE_DIR" -maxdepth 1 -name "*.apk" | head -1)
fi
if [ -z "$RELEASE_APK" ] || [ ! -f "$RELEASE_APK" ]; then
  echo "HATA: APK oluşmadı."
  exit 1
fi
echo "APK: $RELEASE_APK"

DOWNLOAD_DIR="../frontend/public/downloads"
mkdir -p "$DOWNLOAD_DIR"

# Sürüm adı ile dosya: Menuslide.1.0.14.apk
APK_VERSIONED="Menuslide.${VERSION_NAME}.apk"
DEST_VERSIONED="$DOWNLOAD_DIR/$APK_VERSIONED"
cp "$RELEASE_APK" "$DEST_VERSIONED"
echo "Kopyalandı: $DEST_VERSIONED"

# Sabit ad (güncel sürüm): Menuslide.apk — indirme linki değişmesin
DEST_LATEST="$DOWNLOAD_DIR/Menuslide.apk"
cp "$RELEASE_APK" "$DEST_LATEST"
echo "Kopyalandı: $DEST_LATEST"
echo "İndirme: /downloads/Menuslide.apk (güncel) veya /downloads/$APK_VERSIONED"
