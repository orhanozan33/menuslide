# Roku Package Sign Etme (Package Hatası Çözümü)

## ❌ Hata
```
Package file has an invalid header
```

## 🔍 Neden?
Roku Developer Portal, **signed .pkg** dosyası bekliyor.
Biz **.zip** yüklüyoruz ama Roku **.pkg** (signed package) istiyor.

---

## ✅ Çözüm: Roku Cihazda Package Sign Etme

### YÖNTEM 1: Developer Portal'dan Sideload (Önerilen)

#### Adım 1: Roku Cihazı Developer Mode'a Alın

1. **Roku cihazınızda** remote ile şu tuşlara basın:
   ```
   Home x3, Up x2, Right, Left, Right, Left, Right
   (Home 3 kez, Yukarı 2 kez, Sağ, Sol, Sağ, Sol, Sağ)
   ```

2. **Developer Settings** ekranı açılır

3. **Enable Installer** seçin ve **Enable** yapın

4. **Set Password** ile bir şifre belirleyin (örn: `rokudev`)

5. Roku'nun **IP adresini** not edin (örn: `192.168.1.100`)

#### Adım 2: Roku Web Installer'a Girin

1. Bilgisayarınızda tarayıcı açın

2. Roku IP adresine gidin:
   ```
   http://192.168.1.100
   (Kendi Roku IP'nizi yazın)
   ```

3. Kullanıcı adı: **rokudev**
   Şifre: **[Adım 1'de belirlediğiniz şifre]**

#### Adım 3: Package Yükle (Sideload)

1. **Installer** sekmesine gidin

2. **Browse** butonuna tıklayın

3. Dosya seçin:
   ```
   /Users/admin/Desktop/Tvproje/roku-tv/menuslide-roku.zip
   ```

4. **Install** butonuna tıklayın

5. Package yüklenir ve Roku'da çalışır

#### Adım 4: Package'ı Sign Et

1. Roku Web Installer'da **Packager** sekmesine gidin

2. **Package Application** bölümünde:
   - **App Name**: MenuSlide Digital Signage
   - **App Version**: 1.0.24
   - **Password**: [Developer password'ünüz]

3. **Package** butonuna tıklayın

4. **Signed package (.pkg) indirilir**:
   ```
   menuslide-roku_1.0.24.pkg
   ```

5. Bu .pkg dosyasını kaydedin

#### Adım 5: Developer Portal'a Signed Package Yükle

1. Roku Developer Portal'a dönün:
   ```
   https://developer.roku.com/apps/public/850721/package
   ```

2. **Upload** butonuna tıklayın

3. **Signed .pkg dosyasını** seçin:
   ```
   menuslide-roku_1.0.24.pkg
   ```

4. **Submit**

5. ✅ Package başarıyla yüklenir!

---

## YÖNTEM 2: Genkey ve Manual Signing (İleri Seviye)

### Adım 1: Roku'da Genkey

1. Roku Web Installer'da **Utilities** sekmesi

2. **Genkey** butonuna tıklayın

3. Developer ID ve password girin

4. **Generate** - Signing keys oluşturulur

### Adım 2: Package Sign Et

1. **Packager** sekmesine gidin

2. Package bilgilerini girin

3. **Package** tıklayın

4. Signed .pkg indirilir

---

## 🎯 Hızlı Özet

```
1. Roku cihazı Developer Mode'a alın
   → Home x3, Up x2, Right, Left, Right, Left, Right

2. Roku IP'sine tarayıcıdan girin
   → http://[ROKU_IP]
   → Kullanıcı: rokudev, Şifre: [belirlediğiniz]

3. Installer → Browse → menuslide-roku.zip → Install

4. Packager → Package Application → Package

5. İndirilen .pkg dosyasını Developer Portal'a yükle
```

---

## ⚠️ Önemli Notlar

### Developer Mode
- Roku cihazınız aynı WiFi ağında olmalı
- Developer Settings bir kez enable edilir
- Şifreyi unutmayın!

### IP Adresi Bulma
- Roku: Settings → Network → About
- Veya router admin panelinden

### Password
- Basit bir şifre seçin (örn: `rokudev`)
- Signing sırasında gerekli

### Signed Package
- .pkg dosyası Roku tarafından imzalanmış
- Developer Portal bunu kabul eder
- Her cihaz için farklı signing key

---

## 🆘 Sorun Çözme

**Roku Developer Settings açılmıyor?**
→ Tuş kombinasyonunu yavaşça tekrar deneyin
→ Home x3, Up x2, Right, Left, Right, Left, Right

**Roku IP'sine bağlanamıyorum?**
→ Roku ve bilgisayar aynı WiFi'de mi?
→ Roku IP'sini Settings → Network'ten kontrol edin
→ Firewall kapalı mı?

**"Invalid password" hatası?**
→ Developer Settings'te belirlediğiniz şifreyi kullanın
→ Şifreyi sıfırlamak için Developer Settings'e tekrar girin

**Package yüklenmiyor?**
→ Zip dosyası 10 MB'dan küçük olmalı (bizimki 3.5 MB ✅)
→ Manifest doğru mu?
→ Tüm gerekli dosyalar var mı?

**Signed package oluşturulamıyor?**
→ Önce Genkey yapın (Utilities sekmesi)
→ Developer ID ve password doğru mu?

---

## 📝 Alternatif: Private Channel (Sideload Olmadan)

Eğer Roku cihazınız yoksa veya sign edemiyorsanız:

### Seçenek A: Test Cihazı Kullanın
- Roku test cihazı edinin
- Developer Mode'a alın
- Sign edin

### Seçenek B: Beta Testing
- Roku'nun beta testing programına başvurun
- Roku size test cihazı sağlayabilir

### Seçenek C: Partner ile Çalışın
- Roku partner/developer ile çalışın
- Onlar sizin için sign edebilir

---

## ✅ Başarı Sonrası

Package başarıyla yüklendikten sonra:

1. ✅ Version: 1.0.24 görünür
2. ✅ Package validation başarılı
3. ✅ Store assets, listing setup, vb. tamamlayın
4. ✅ Private channel olarak yayınlayın
5. ✅ Access Code: RHPDKNB ile test edin

---

## 📞 Yardım

- **Roku Developer Forum**: https://community.roku.com/
- **Package Guide**: https://developer.roku.com/docs/developer-program/getting-started/architecture/packaging.md
- **Email**: developer@roku.com

---

**ŞİMDİ**: Roku cihazınızı Developer Mode'a alın ve package'ı sign edin! 🚀
