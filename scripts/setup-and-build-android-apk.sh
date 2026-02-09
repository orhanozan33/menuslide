#!/usr/bin/env bash
#
# macOS: Java 17 + Android SDK kurar (yoksa), sonra TV uygulaması APK derler ve
# frontend/public/downloads/Menuslide.apk olarak kopyalar.
# Tek seferde: ./scripts/setup-and-build-android-apk.sh
#
set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

echo "=============================================="
echo "  1) Java 17 kontrolü"
echo "=============================================="
if ! java -version 2>&1 | grep -qE "17|18|21"; then
  echo "Java 17 bulunamadı. Homebrew ile kuruluyor..."
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew yüklü değil. Önce kurun: https://brew.sh"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
  fi
  brew install openjdk@17
  export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
  if [ -d "/usr/local/opt/openjdk@17" ]; then
    export PATH="/usr/local/opt/openjdk@17/bin:$PATH"
    export JAVA_HOME="/usr/local/opt/openjdk@17"
  fi
else
  export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home 2>/dev/null || echo '')}"
  [ -z "$JAVA_HOME" ] && export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
fi
java -version
echo ""

echo "=============================================="
echo "  2) Android SDK kontrolü"
echo "=============================================="
if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
    echo "ANDROID_HOME=$ANDROID_HOME (Android Studio SDK)"
  elif [ -d "/usr/local/share/android-commandlinetools" ]; then
    export ANDROID_HOME="/usr/local/share/android-commandlinetools"
    echo "ANDROID_HOME=$ANDROID_HOME (commandlinetools)"
  else
    echo "ANDROID_HOME tanımlı değil ve ~/Library/Android/sdk yok."
    echo ""
    echo "İki seçenek:"
    echo "  A) Android Studio kurun: https://developer.android.com/studio"
    echo "     Kurulumdan sonra Android Studio'yu bir kez açıp SDK'yı indirin."
    echo "     Sonra bu scripti tekrar çalıştırın."
    echo "  B) Sadece komut satırı araçları:"
    echo "     brew install --cask android-commandlinetools"
    echo "     Sonra ANDROID_HOME ayarlayıp bu scripti tekrar çalıştırın."
    echo ""
    exit 1
  fi
fi
echo "ANDROID_HOME=$ANDROID_HOME"
echo ""

echo "=============================================="
echo "  3) SDK lisansları (gerekirse)"
echo "=============================================="
if [ -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses 2>/dev/null || true
fi
echo ""

echo "=============================================="
echo "  4) APK derleniyor..."
echo "=============================================="
cd "$PROJECT_ROOT/android-tv"
export JAVA_HOME
if ! ./gradlew assembleRelease 2>/dev/null; then
  echo "Gradle wrapper hatası. Gradle ile wrapper oluşturuluyor..."
  if command -v gradle >/dev/null 2>&1; then
    gradle wrapper --gradle-version=8.1.2
    ./gradlew assembleRelease
  else
    echo "Gradle yüklü değil. Kurun: brew install gradle"
    echo "Sonra: cd android-tv && gradle wrapper --gradle-version=8.1.2 && ./gradlew assembleRelease"
    exit 1
  fi
fi
APK_SIGNED="app/build/outputs/apk/release/app-release.apk"
APK_UNSIGNED="app/build/outputs/apk/release/app-release-unsigned.apk"
if [ -f "$APK_SIGNED" ]; then
  APK="$APK_SIGNED"
elif [ -f "$APK_UNSIGNED" ]; then
  APK="$APK_UNSIGNED"
else
  echo "HATA: APK oluşmadı."
  exit 1
fi
mkdir -p "$PROJECT_ROOT/frontend/public/downloads"
cp "$APK" "$PROJECT_ROOT/frontend/public/downloads/Menuslide.apk"
echo ""
echo "=============================================="
echo "  Tamamlandı: frontend/public/downloads/Menuslide.apk"
echo "  Ana sayfadan indirilebilir."
echo "=============================================="
