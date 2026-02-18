#!/usr/bin/env bash
#
# Android TV / cihaza APK yükler.
# Kullanım: ./scripts/install-android-tv-apk.sh
# Önce: TV'de USB hata ayıklama açın, USB ile bağlayın veya adb connect IP:5555 yapın.
#
set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

# ADB yolunu bul
ADB=""
if [ -n "$ANDROID_HOME" ] && [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
  ADB="$ANDROID_HOME/platform-tools/adb"
elif [ -x "$HOME/Library/Android/sdk/platform-tools/adb" ]; then
  ADB="$HOME/Library/Android/sdk/platform-tools/adb"
elif [ -x "/usr/local/share/android-commandlinetools/platform-tools/adb" ]; then
  ADB="/usr/local/share/android-commandlinetools/platform-tools/adb"
else
  ADB="adb"
fi

# APK yolunu bul (öncelik: downloads, sonra release build)
APK=""
if [ -f "$PROJECT_ROOT/frontend/public/downloads/Menuslide.apk" ]; then
  APK="$PROJECT_ROOT/frontend/public/downloads/Menuslide.apk"
elif [ -f "$PROJECT_ROOT/android-tv/app/build/outputs/apk/release/app-release.apk" ]; then
  APK="$PROJECT_ROOT/android-tv/app/build/outputs/apk/release/app-release.apk"
else
  echo "APK bulunamadı. Önce derleyin: ./scripts/setup-and-build-android-apk.sh"
  exit 1
fi

echo "=============================================="
echo "  1) Bağlı cihazlar"
echo "=============================================="
"$ADB" devices
echo ""

COUNT=$("$ADB" devices | grep -c "device$" || true)
if [ "$COUNT" -eq 0 ]; then
  echo "Bağlı cihaz yok."
  echo ""
  echo "Yapılacaklar:"
  echo "  - Android TV'de: Ayarlar → Güvenlik → USB hata ayıklama AÇIK"
  echo "  - TV ile bilgisayarı USB ile bağlayın VEYA"
  echo "  - Wi-Fi için: önce USB ile bağlıyken: $ADB tcpip 5555"
  echo "    Sonra: $ADB connect TV_IP_ADRESI:5555"
  echo ""
  exit 1
fi

echo "=============================================="
echo "  2) APK yükleniyor"
echo "=============================================="
echo "APK: $APK"
echo ""
"$ADB" install -r "$APK"
echo ""
echo "Kurulum tamamlandı."
