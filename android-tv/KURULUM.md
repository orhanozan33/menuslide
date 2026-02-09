# Android APK derlemek için kurulum (macOS)

## 1. Java 17

Terminalde (başka bir `brew install` çalışmıyorsa):

```bash
brew install openjdk@17
```

Kurulumdan sonra (her yeni terminalde veya `~/.zshrc`'a ekleyin):

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
```

(Intel Mac ise: `/usr/local/opt/openjdk@17`)

Kontrol: `java -version` → 17.x görmelisiniz.

---

## 2. Android SDK

**En kolay yol:** [Android Studio](https://developer.android.com/studio) indirip kurun. İlk açılışta "Standard" ile SDK indirilsin. Kurulum bitince bir kez kapatabilirsiniz.

SDK yolu genelde: `~/Library/Android/sdk`

Terminalde kalıcı ayar (örn. `~/.zshrc`):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH
```

---

## 3. APK derleme ve kopyalama

Proje kökünde (Tvproje):

```bash
./scripts/setup-and-build-android-apk.sh
```

Veya sadece derleyip kopyalamak için:

```bash
cd android-tv
./build-and-copy-apk.sh
```

APK: `frontend/public/downloads/Menuslide.apk` olur; ana sayfadan indirilebilir.

---

## 4. İmzalı APK (isteğe bağlı)

Gerçek cihazda yüklü kalması ve güncellemelerin üzerine yazması için release APK’yı imzalayabilirsiniz.

**4.1 Keystore oluşturma (bir kez):**

```bash
cd android-tv
keytool -genkey -v -keystore menuslide.keystore -alias menuslide -keyalg RSA -keysize 2048 -validity 10000
```

İsim, kurum birimi vb. sorulur; en az şifreyi (store + key) güçlü seçin. `menuslide.keystore` dosyası oluşur; bu dosyayı ve şifreyi güvende tutun.

**4.2 Ayarları yazma:**

```bash
cp keystore.properties.example keystore.properties
```

`keystore.properties` içinde şunları kendi değerlerinizle doldurun:

- `storeFile=menuslide.keystore`
- `storePassword=` ve `keyPassword=` (keystore şifresi)
- `keyAlias=menuslide`

**4.3 Derleme:**

```bash
./scripts/setup-and-build-android-apk.sh
```

Bu kez çıkan APK imzalı olur (`app-release.apk`); script bunu yine `frontend/public/downloads/Menuslide.apk` olarak kopyalar. Bu dosyayı Ayarlar > Android TV > "APK'yı depolamaya yükle" ile Supabase'e yükleyin.

---

## 5. "Paket bozuk" / "Package is corrupt" hatası

Bu uyarı genelde **imzasız** APK yüklendiğinde çıkar. Çözüm:

1. **İmzalı APK üretin** (yukarıdaki Bölüm 4’ü uygulayın: keystore + `keystore.properties` + derleme).
2. Oluşan **imzalı** `Menuslide.apk` dosyasını Supabase’e yükleyin (Ayarlar > Android TV > APK’yı depolamaya yükle).
3. Kullanıcıların indirdiği APK artık imzalı olacağı için "Paket bozuk" hatası kaybolur.

İmzasız APK yalnızca debug / test için uygundur; dağıtım ve indirme linki için mutlaka imzalı release kullanın.
