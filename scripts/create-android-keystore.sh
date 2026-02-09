#!/usr/bin/env bash
# MenuSlide TV için release keystore ve keystore.properties oluşturur.
# Bir kez çalıştırın; şifre keystore.properties içinde kalır (Git'e eklenmez).
set -e
cd "$(dirname "$0")/.."
ANDROID_TV="$(pwd)/android-tv"
cd "$ANDROID_TV"

if [ -f "menuslide.keystore" ] && [ -f "keystore.properties" ]; then
  echo "Keystore ve keystore.properties zaten var. Yeniden oluşturmak için önce silin."
  exit 0
fi

JAVA_HOME="${JAVA_HOME:-/usr/local/opt/openjdk@17}"
[ -d "/opt/homebrew/opt/openjdk@17" ] && JAVA_HOME="/opt/homebrew/opt/openjdk@17"
KEYTOOL="${JAVA_HOME}/bin/keytool"
[ ! -x "$KEYTOOL" ] && KEYTOOL=$(command -v keytool 2>/dev/null) || true
if [ -z "$KEYTOOL" ] || [ ! -x "$KEYTOOL" ]; then
  echo "keytool bulunamadı. JAVA_HOME=$JAVA_HOME"
  exit 1
fi

# Rastgele şifre (12 karakter, yazdırılabilir)
PASS=$(openssl rand -base64 12 | tr -d '\n/+=' | head -c 16)
[ -z "$PASS" ] && PASS="menuslide-release-$(date +%s)"

echo "Keystore oluşturuluyor: $ANDROID_TV/menuslide.keystore"
"$KEYTOOL" -genkey -v -keystore menuslide.keystore -alias menuslide \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=MenuSlide TV, OU=App, O=MenuSlide, L=Istanbul, ST=Istanbul, C=TR"

echo "storeFile=menuslide.keystore" > keystore.properties
echo "storePassword=$PASS" >> keystore.properties
echo "keyAlias=menuslide" >> keystore.properties
echo "keyPassword=$PASS" >> keystore.properties
echo ""
echo "Tamamlandı: menuslide.keystore ve keystore.properties oluşturuldu."
echo "Şifreyi saklayın (güncelleme imzası için gerekli): keystore.properties içinde."
echo "İmzalı APK için: ./scripts/setup-and-build-android-apk.sh"
