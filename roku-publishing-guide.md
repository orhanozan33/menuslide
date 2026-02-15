# Roku Channel Store Yayınlama Rehberi - MenuSlide Digital Signage

## 📋 Hazırlık Checklist

### Gerekli Materyaller (✅ HAZIR)
- [x] **Package**: `roku-tv/menuslide-roku.zip` (v1.0.24, 3.5 MB)
- [x] **Channel Poster** (540x405): `icon-focus-fhd.png`
- [x] **Channel Icon** (290x218): `icon-focus.png`
- [x] **Side Icon HD** (214x144): `icon-side-214x144.png`
- [x] **Side Icon SD** (108x69): `icon-side-108x69.png`
- [x] **Splash Screen** (1920x1080): `splash.png`

### Hazırlanması Gerekenler
- [ ] **Screenshots** (1920x1080): En az 3 adet ekran görüntüsü
- [ ] **Privacy Policy URL**: Gizlilik politikası sayfası
- [ ] **Support Website**: Destek web sitesi
- [ ] **Support Email**: Destek email adresi
- [ ] **Developer Account**: $50/yıl ödeme

---

## ADIM 1: Roku Developer Hesabı Oluşturma

### 1.1 Hesap Oluşturma
1. **URL**: https://developer.roku.com
2. **Sign Up** butonuna tıklayın
3. Gerekli bilgileri doldurun:
   - First Name / Last Name
   - Email Address
   - Password
   - Company Name (opsiyonel)
4. Email doğrulama linkine tıklayın

### 1.2 Developer Program'a Katılma
1. https://developer.roku.com/enrollment adresine gidin
2. **Enroll Now** butonuna tıklayın
3. **Ödeme Bilgileri**:
   - Ücret: **$50 USD/yıl** (zorunlu)
   - Kredi kartı bilgilerini girin
   - Fatura bilgilerini doldurun
4. **Submit Payment**

⚠️ **ÖNEMLİ**: Bu ücret ödenmeden channel yayınlayamazsınız!

---

## ADIM 2: Developer Dashboard'a Giriş

1. https://developer.roku.com/developer adresine gidin
2. **Sign In** yapın
3. Sol menüden **"Manage My Channels"** seçin
4. **"Add Channel"** butonuna tıklayın

---

## ADIM 3: Channel Tipi Seçimi

### Public vs Private Channel

**Private Channel (Önerilen - İlk Başta)**
- ✅ Hemen yayına girer (review yok)
- ✅ Access code ile erişim
- ✅ Test için ideal
- ✅ İstediğiniz zaman güncelleyebilirsiniz
- ✅ Müşterilere kod vererek test ettirin
- ❌ Roku Channel Store'da görünmez

**Public Channel**
- ✅ Roku Channel Store'da herkes görebilir
- ✅ Arama sonuçlarında çıkar
- ❌ Review süreci: 3-7 iş günü
- ❌ Her güncelleme review gerektirir

**ÖNERİ**: İlk başta **Private** seçin, test edin, sonra **Public** yapın.

---

## ADIM 4: Temel Bilgiler (Channel Properties)

### 4.1 Channel Information
```
Channel Name: MenuSlide Digital Signage
Developer Name: [Şirket/Kişi Adınız - örn: MenuSlide Inc.]
Support Email: support@menuslide.com (veya kendi email'iniz)
Support Website: https://menuslide.com (veya kendi siteniz)
```

### 4.2 Description (İngilizce - Zorunlu)
```
MenuSlide Digital Signage - Professional digital menu board solution for restaurants, cafes, and retail stores.

Transform any TV with Roku into a dynamic digital menu board. Display your menus, products, prices, and promotions with beautiful templates.

Features:
• Easy setup with activation code
• Real-time menu updates
• Professional templates
• Automatic content rotation
• Perfect for restaurants, cafes, bars, and retail stores
• Cloud-based management
• No additional hardware required

Simply activate your screen with a code from menuslide.com and start displaying your content immediately.
```

### 4.3 Description (Türkçe - Opsiyonel)
```
MenuSlide Dijital Tabela - Restoranlar, kafeler ve perakende mağazaları için profesyonel dijital menü panosu çözümü.

Roku'lu herhangi bir TV'yi dinamik dijital menü panosuna dönüştürün. Menülerinizi, ürünlerinizi, fiyatlarınızı ve promosyonlarınızı güzel şablonlarla gösterin.

Özellikler:
• Aktivasyon kodu ile kolay kurulum
• Gerçek zamanlı menü güncellemeleri
• Profesyonel şablonlar
• Otomatik içerik rotasyonu
• Restoranlar, kafeler, barlar ve mağazalar için ideal
• Bulut tabanlı yönetim
• Ek donanım gerektirmez

Ekranınızı menuslide.com'dan aldığınız kod ile aktive edin ve içeriğinizi hemen göstermeye başlayın.
```

### 4.4 Category Selection
- **Primary Category**: Business
- **Secondary Category**: Food & Drink (opsiyonel)

### 4.5 Parental Rating
- **Content Rating**: No Rating (veya G - General Audience)
- **Reason**: Commercial/business content, no age restriction needed

### 4.6 Languages
- **Primary Language**: English
- **Additional Languages**: Turkish (opsiyonel)

### 4.7 Countries/Regions
- **Worldwide** (tüm ülkeler)
- Veya spesifik: **Canada, United States, Turkey**

### 4.8 Properties
```
Internet Required: Yes
Screensaver: No
Voice Control: No
4K/UHD Support: No (FHD - 1920x1080)
```

---

## ADIM 5: Package (Uygulama) Yükleme

### 5.1 Package Upload
1. **"Package"** sekmesine gidin
2. **"Upload Package"** butonuna tıklayın
3. Dosya seçin: `/Users/admin/Desktop/Tvproje/roku-tv/menuslide-roku.zip`
4. Bilgileri doldurun:

```
Version: 1.0.24
Minimum Roku OS Version: 10.0 (önerilir)
Release Notes: Initial release - MenuSlide Digital Signage for restaurants and retail
```

### 5.2 Package Validation
- Roku otomatik olarak package'ı kontrol eder
- Hata varsa gösterir (manifest, icon boyutları, vb.)
- ✅ Validation başarılı olmalı

---

## ADIM 6: Görselleri Yükleme

### 6.1 Channel Poster (Zorunlu)
- **Boyut**: 540x405 piksel
- **Dosya**: `roku-tv/images/icon-focus-fhd.png`
- **Format**: PNG veya JPG
- **Kullanım**: Roku home screen, channel store

### 6.2 Channel Icon (Opsiyonel ama önerilir)
- **Boyut**: 290x218 piksel
- **Dosya**: `roku-tv/images/icon-focus.png`
- **Format**: PNG veya JPG

### 6.3 Side Icon HD (Opsiyonel)
- **Boyut**: 214x144 piksel
- **Dosya**: `roku-tv/images/icon-side-214x144.png`

### 6.4 Side Icon SD (Opsiyonel)
- **Boyut**: 108x69 piksel
- **Dosya**: `roku-tv/images/icon-side-108x69.png`

---

## ADIM 7: Screenshots (Ekran Görüntüleri)

### 7.1 Gereksinimler
- **Boyut**: 1920x1080 (FHD) veya 1280x720 (HD)
- **Minimum**: 3 adet
- **Maksimum**: 10 adet
- **Format**: PNG veya JPG
- **Dosya boyutu**: Her biri max 5 MB

### 7.2 Screenshot Nasıl Alınır?

**Yöntem 1: Roku Cihazında**
1. Roku'da MenuSlide uygulamasını çalıştırın
2. Farklı template'leri gösterin
3. Roku remote'ta: **Home + Home + Home + Home + Home** (5 kez Home)
4. Developer Settings açılır
5. **Screenshot Utility** seçin
6. Screenshot'lar USB'ye kaydedilir

**Yöntem 2: Fotoğraf Çekme**
1. TV ekranından kaliteli fotoğraf çekin
2. Photoshop/GIMP ile 1920x1080'e resize edin
3. Parlaklık/kontrast ayarlayın

### 7.3 Önerilen Screenshot'lar
1. **Hamburger menü template** - Fiyatlar ve ürün görselleri
2. **Kahve/içecek menü** - Farklı template stili
3. **Promosyon/kampanya** - Özel teklif gösterimi
4. **Aktivasyon ekranı** - Kod girişi (opsiyonel)
5. **Çoklu ürün listesi** - Grid layout

---

## ADIM 8: Privacy Policy (Gizlilik Politikası)

### 8.1 Neden Gerekli?
- Roku zorunlu kılıyor (özellikle Public channel için)
- Kullanıcı verilerinin nasıl işlendiğini açıklar

### 8.2 Privacy Policy Oluşturma

**Basit Örnek (menuslide.com/privacy):**

```markdown
# Privacy Policy - MenuSlide Digital Signage

Last Updated: February 15, 2026

## Overview
MenuSlide Digital Signage is a business-to-business (B2B) application designed for commercial use by restaurants, cafes, and retail stores.

## Data Collection
MenuSlide does NOT collect any personal information from end users or viewers. The application:
- Does not require user registration on the device
- Does not track viewer behavior
- Does not collect analytics from viewers
- Does not use cookies or tracking technologies

## Business Data
The application displays content provided by business owners through the MenuSlide web platform. This content includes:
- Menu items and prices
- Product images
- Business information
- Promotional content

## Device Information
The application requires:
- An activation code to link the device to a business account
- Internet connection to receive content updates
- Device identifier for content delivery

## Third-Party Services
MenuSlide uses:
- Cloud storage for content delivery (DigitalOcean Spaces)
- Supabase for backend services

## Data Security
All data transmission is encrypted using HTTPS. Business content is stored securely in the cloud.

## Children's Privacy
MenuSlide is a commercial application not directed at children under 13.

## Changes to This Policy
We may update this privacy policy from time to time. Changes will be posted on this page.

## Contact
For privacy questions: support@menuslide.com
```

### 8.3 Privacy Policy URL
- Kendi web sitenizde yayınlayın: `https://menuslide.com/privacy`
- Veya GitHub Pages kullanın (ücretsiz)
- Developer Portal'da URL'i girin

---

## ADIM 9: Monetization (Para Kazanma)

### 9.1 Monetization Model Seçimi

**Free (Ücretsiz) - ÖNERİLEN**
- Uygulama ücretsiz indirilir
- Para kazanma web platformu üzerinden (SaaS abonelik)
- Roku'da reklam yok

**Subscription (Abonelik)**
- Aylık/yıllık ücret
- Roku %20 komisyon alır
- Karmaşık entegrasyon gerektirir

**One-time Purchase (Tek Seferlik)**
- Tek ödeme
- Roku %20 komisyon alır

**ÖNERİ**: **Free** seçin - para kazanma menuslide.com üzerinden olsun.

---

## ADIM 10: Test Channel (Private Channel)

### 10.1 Private Channel Oluşturma
1. Channel Type: **Private** seçin
2. Tüm bilgileri doldurun (yukarıdaki adımlar)
3. **Submit** butonuna tıklayın
4. Channel hemen yayına girer (review yok!)

### 10.2 Access Code Alma
1. Channel yayına girdikten sonra **Access Code** görünür
2. Örnek: **ABCD1234**
3. Bu kodu müşterilerinize/test kullanıcılarına verin

### 10.3 Private Channel Yükleme
1. Roku cihazda: **Settings** → **System** → **System Update**
2. Veya: https://my.roku.com/account/add adresine gidin
3. **Access Code** girin: **ABCD1234**
4. **Add Channel** butonuna tıklayın
5. Channel Roku cihaza yüklenir

### 10.4 Test Etme
- Farklı Roku cihazlarda test edin
- Farklı template'leri deneyin
- Aktivasyon akışını kontrol edin
- Crash/donma olup olmadığını kontrol edin
- İçerik güncellemelerini test edin

---

## ADIM 11: Public Channel'a Geçiş

### 11.1 Ne Zaman Public Yapmalı?
- ✅ Private channel'da 1-2 hafta test ettiniz
- ✅ Hiçbir kritik bug yok
- ✅ Müşteri geri bildirimleri olumlu
- ✅ Screenshot'lar hazır
- ✅ Privacy policy yayında

### 11.2 Public'e Geçiş
1. Developer Dashboard → Channel seçin
2. **"Convert to Public"** butonuna tıklayın
3. Eksik bilgileri tamamlayın (screenshot'lar, vb.)
4. **"Submit for Review"** butonuna tıklayın

### 11.3 Review Süreci
- **Süre**: 3-7 iş günü (bazen daha hızlı)
- **İnceleme**: Roku ekibi uygulamayı test eder
- **Email**: Sonuç email ile bildirilir

### 11.4 Olası Red Nedenleri
- ❌ Uygulama crash oluyor
- ❌ Görsel kalitesi düşük
- ❌ Privacy policy eksik/geçersiz
- ❌ Icon boyutları yanlış
- ❌ İçerik standartlarına uygun değil
- ❌ Telif hakkı ihlali

### 11.5 Red Edilirse Ne Yapmalı?
1. Roku'nun geri bildirimini okuyun
2. Sorunları düzeltin
3. Yeni package yükleyin
4. Tekrar submit edin

---

## ADIM 12: Güncelleme Yapma

### 12.1 Güncelleme Süreci
1. Kod değişikliklerini yapın
2. `manifest` → `build_version` artırın (örn: 24 → 25)
3. `./package.sh` ile yeni zip oluşturun
4. Developer Dashboard → Channel → **"Upload New Package"**
5. Yeni `menuslide-roku.zip` yükleyin
6. **Version notes** yazın
7. **Submit**

### 12.2 Private Channel Güncelleme
- ✅ Hemen yayına girer
- ✅ Review yok
- ✅ Kullanıcılar otomatik güncelleme alır

### 12.3 Public Channel Güncelleme
- ❌ Review süreci gerekir (3-7 gün)
- ✅ Onaylandıktan sonra otomatik güncelleme

---

## ADIM 13: Channel Yönetimi

### 13.1 Analytics
- Developer Dashboard'da kullanım istatistikleri
- Kaç cihazda yüklü?
- Günlük aktif kullanıcı
- Kurulum/kaldırma sayıları

### 13.2 User Feedback
- Roku Channel Store'da kullanıcı yorumları
- Rating (1-5 yıldız)
- Geri bildirimlere yanıt verin

### 13.3 Support
- Support email'e gelen soruları yanıtlayın
- FAQ sayfası oluşturun
- Video tutorial hazırlayın

---

## 💰 Maliyet Özeti

| Ücret | Tutar | Periyot |
|-------|-------|---------|
| **Roku Developer Program** | $50 USD | Yıllık (zorunlu) |
| **Channel Yayınlama** | Ücretsiz | - |
| **Güncelleme** | Ücretsiz | - |
| **Private Channel** | Ücretsiz | - |
| **Public Channel** | Ücretsiz | - |

**Toplam**: $50/yıl

---

## 📞 Destek Kaynakları

### Roku Developer Resources
- **Developer Portal**: https://developer.roku.com
- **Documentation**: https://developer.roku.com/docs
- **Forum**: https://community.roku.com/
- **Email Support**: developer@roku.com

### MenuSlide Resources
- **Web Platform**: https://menuslide.com
- **Support Email**: support@menuslide.com
- **Documentation**: (kendi dökümanlarınız)

---

## ✅ Son Checklist (Yayınlamadan Önce)

### Hesap ve Ödeme
- [ ] Roku Developer hesabı oluşturuldu
- [ ] $50 enrollment fee ödendi
- [ ] Email doğrulandı

### Uygulama Dosyaları
- [ ] `menuslide-roku.zip` hazır (v1.0.24)
- [ ] Package validation başarılı
- [ ] Roku cihazda test edildi
- [ ] Crash/bug yok

### Görseller
- [ ] Channel Poster (540x405) yüklendi
- [ ] Channel Icon (290x218) yüklendi
- [ ] Side Icon'lar yüklendi
- [ ] 3+ screenshot hazır (1920x1080)

### Dokümantasyon
- [ ] Privacy Policy URL hazır
- [ ] Support website hazır
- [ ] Support email hazır
- [ ] Description yazıldı (İngilizce)

### Test
- [ ] Private channel oluşturuldu
- [ ] Access code ile test edildi
- [ ] Farklı cihazlarda test edildi
- [ ] Müşteri/kullanıcı geri bildirimi alındı

### Public Yayın (Opsiyonel)
- [ ] Private test tamamlandı (1-2 hafta)
- [ ] Tüm bug'lar düzeltildi
- [ ] Screenshot'lar yüklendi
- [ ] "Convert to Public" yapıldı
- [ ] Review için submit edildi

---

## 🎯 Sonraki Adımlar

1. **ŞİMDİ**: Roku Developer hesabı oluştur ve $50 öde
2. **BUGÜN**: Privacy policy sayfası hazırla
3. **BUGÜN**: Screenshot'ları al (3-5 adet)
4. **YARIN**: Private channel oluştur
5. **BU HAFTA**: Test et ve geri bildirim al
6. **GELECEK HAFTA**: Public channel'a geçiş

---

## 📝 Notlar

- İlk başta **Private Channel** ile başlayın - güvenli ve hızlı
- Screenshot'lar çok önemli - kaliteli ve profesyonel olmalı
- Privacy policy basit olabilir ama olmalı
- Review süreci sabır gerektirir - 3-7 gün normal
- Red edilirse panik yapmayın - düzeltin ve tekrar gönderin

---

**Hazırlayan**: AI Assistant
**Tarih**: 15 Şubat 2026
**Versiyon**: 1.0
**Uygulama**: MenuSlide Digital Signage v1.0.24
