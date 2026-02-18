#!/usr/bin/env bash
#
# macOS: Gerekli kurulumları yapar (Java 17, Android SDK, gerekirse Homebrew/Gradle),
# sonra TV uygulaması APK derler ve frontend/public/downloads/Menuslide.apk olarak kopyalar.
# Tek seferde: ./scripts/setup-and-build-android-apk.sh
#
set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

# Homebrew yoksa kurulum talimatı (otomatik kurulum uzun sürer)
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew bulunamadı. Kurulum için:"
  echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  echo "Kurduktan sonra bu scripti tekrar çalıştırın."
  exit 1
fi

# HOMEBREW_PREFIX (Apple Silicon: /opt/homebrew, Intel: /usr/local)
BREW_PREFIX="${HOMEBREW_PREFIX:-$(brew --prefix 2>/dev/null || echo "/usr/local")}"

echo "=============================================="
echo "  1) Java 17"
echo "=============================================="
setup_java() {
  export PATH="$BREW_PREFIX/opt/openjdk@17/bin:$PATH"
  export JAVA_HOME="$BREW_PREFIX/opt/openjdk@17"
  if [ ! -d "$JAVA_HOME" ]; then
    JAVA_HOME="/usr/local/opt/openjdk@17"
    PATH="/usr/local/opt/openjdk@17/bin:$PATH"
  fi
  if [ -d "$JAVA_HOME" ] && java -version 2>&1 | grep -qE "17|18|21"; then
    return 0
  fi
  return 1
}
if ! setup_java 2>/dev/null; then
  echo "Java 17 kuruluyor (brew install openjdk@17)..."
  brew install openjdk@17
  setup_java
fi
export PATH="$BREW_PREFIX/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="$BREW_PREFIX/opt/openjdk@17"
[ -d "/usr/local/opt/openjdk@17" ] && export JAVA_HOME="/usr/local/opt/openjdk@17" && export PATH="/usr/local/opt/openjdk@17/bin:$PATH"
java -version
echo ""

echo "=============================================="
echo "  2) Android SDK"
echo "=============================================="
if [ -z "$ANDROID_HOME" ] || [ ! -d "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
    echo "ANDROID_HOME=$ANDROID_HOME (Android Studio)"
  elif [ -d "$BREW_PREFIX/share/android-commandlinetools" ]; then
    export ANDROID_HOME="$BREW_PREFIX/share/android-commandlinetools"
    echo "ANDROID_HOME=$ANDROID_HOME (Homebrew)"
  elif [ -d "/usr/local/share/android-commandlinetools" ]; then
    export ANDROID_HOME="/usr/local/share/android-commandlinetools"
    echo "ANDROID_HOME=$ANDROID_HOME (Homebrew)"
  else
    echo "Android SDK bulunamadı. Homebrew ile kuruluyor (brew install --cask android-commandlinetools)..."
    brew install --cask android-commandlinetools
    if [ -d "$BREW_PREFIX/share/android-commandlinetools" ]; then
      export ANDROID_HOME="$BREW_PREFIX/share/android-commandlinetools"
    else
      export ANDROID_HOME="/usr/local/share/android-commandlinetools"
    fi
    echo "ANDROID_HOME=$ANDROID_HOME"
  fi
fi
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# Gerekli SDK bileşenleri (platform android-34, build-tools 34.x, platform-tools)
SDKMAN="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [ -x "$SDKMAN" ]; then
  echo "Gerekli SDK paketleri kontrol ediliyor..."
  yes | "$SDKMAN" --licenses 2>/dev/null || true
  "$SDKMAN" "platform-tools" "platforms;android-34" "build-tools;34.0.0" 2>/dev/null || true
fi
echo "ANDROID_HOME=$ANDROID_HOME"
echo ""

echo "=============================================="
echo "  3) SDK lisansları"
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
  echo "Gradle wrapper hatası. Sistem Gradle ile tekrar denenecek..."
  if ! command -v gradle >/dev/null 2>&1; then
    echo "Gradle kuruluyor (brew install gradle)..."
    brew install gradle
  fi
  if command -v gradle >/dev/null 2>&1; then
    gradle wrapper --gradle-version=8.7 --distribution-type=bin
    ./gradlew assembleRelease
  else
    echo "HATA: Gradle kurulamadı. Manuel: brew install gradle"
    exit 1
  fi
fi
RELEASE_DIR="app/build/outputs/apk/release"
APK_SIGNED="$RELEASE_DIR/app-release.apk"
APK_UNSIGNED="$RELEASE_DIR/app-release-unsigned.apk"
# Proje Menuslide.<version>.apk adında da üretir (app/build.gradle applicationVariants)
APK_MENUSLIDE=$(ls "$RELEASE_DIR"/Menuslide.*.apk 2>/dev/null | head -1)
if [ -n "$APK_MENUSLIDE" ] && [ -f "$APK_MENUSLIDE" ]; then
  APK="$APK_MENUSLIDE"
elif [ -f "$APK_SIGNED" ]; then
  APK="$APK_SIGNED"
elif [ -f "$APK_UNSIGNED" ]; then
  APK="$APK_UNSIGNED"
else
  echo "HATA: APK oluşmadı. $RELEASE_DIR içine bakın."
  exit 1
fi
mkdir -p "$PROJECT_ROOT/frontend/public/downloads"
cp "$APK" "$PROJECT_ROOT/frontend/public/downloads/Menuslide.apk"
echo ""
echo "=============================================="
echo "  Tamamlandı: frontend/public/downloads/Menuslide.apk"
echo "  Ana sayfadan indirilebilir."
echo "=============================================="
