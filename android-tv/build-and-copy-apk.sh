#!/usr/bin/env bash
# Release APK üretir ve frontend/public/downloads/Menuslide.apk olarak kopyalar.
# Her build'de version.properties içindeki versionCode otomatik artar.
# Gereksinim: Java (JDK 17) ve Android SDK (ANDROID_HOME).
set -e
cd "$(dirname "$0")"

VERSION_FILE="version.properties"
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
    echo "Version: versionCode $code -> $next, versionName=$versionName"
  fi
fi

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
