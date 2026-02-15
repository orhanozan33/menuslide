# Roku MenuSlide - Sonraki Adımlar

## ✅ Mevcut Durum
- Roku Developer hesabı: ✅ Aktif
- MenuSlide uygulaması: ✅ Oluşturulmuş (Unpublished)
- Son güncelleme: 12 Şubat 2026

---

## 🎯 Şimdi Yapılacaklar

### 1. MenuSlide Uygulamasını Aç
```
Roku Developer Portal'da:
→ "MenuSlide" satırındaki 3 nokta (...) menüsüne tıkla
→ "Edit" veya "Manage" seç
```

### 2. Package Yükle
```
→ "Package" sekmesine git
→ "Upload Package" buton
→ Dosya seç: /Users/admin/Desktop/Tvproje/roku-tv/menuslide-roku.zip
→ Version: 1.0.24
→ Minimum Roku OS: 10.0
→ Submit
```

### 3. Görselleri Yükle
```
→ "Channel Store Info" veya "Images" sekmesi
→ Görselleri yükle:

Channel Poster (540x405):
/Users/admin/Desktop/Tvproje/roku-tv/images/icon-focus-fhd.png

Channel Icon (290x218):
/Users/admin/Desktop/Tvproje/roku-tv/images/icon-focus.png

Side Icon HD (214x144):
/Users/admin/Desktop/Tvproje/roku-tv/images/icon-side-214x144.png

Side Icon SD (108x69):
/Users/admin/Desktop/Tvproje/roku-tv/images/icon-side-108x69.png
```

### 4. Screenshot'ları Ekle
```
→ "Screenshots" sekmesi
→ 3-5 adet ekran görüntüsü yükle (1920x1080)
→ Roku'da uygulamayı çalıştırıp fotoğraf çek
```

### 5. Channel Bilgilerini Tamamla
```
→ "Channel Properties" veya "Details" sekmesi

Channel Name: MenuSlide Digital Signage
Developer Name: [Şirketiniz]
Support Email: support@menuslide.com
Support Website: https://menuslide.com
Category: Business
Rating: No Rating
Internet Required: Yes

Description (İngilizce):
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

### 6. Privacy Policy Ekle
```
→ "Privacy Policy" alanı
→ URL: https://menuslide.com/privacy
(Henüz yoksa basit bir sayfa oluştur - şablon roku-publishing-guide.md'de)
```

### 7. Channel Type Seç
```
→ "Channel Type" veya "Distribution"
→ İlk başta: PRIVATE (test için)
→ Test sonrası: PUBLIC (herkes için)
```

### 8. Monetization
```
→ "Monetization" sekmesi
→ Model: FREE (ücretsiz)
```

### 9. Submit / Publish
```
PRIVATE için:
→ "Save" veya "Publish" butonu
→ Hemen yayına girer
→ Access Code alırsınız

PUBLIC için:
→ "Submit for Review" butonu
→ 3-7 gün review süreci
```

---

## 🔍 Eksik Bilgiler Kontrolü

Roku Developer Portal'da uygulamayı açtığınızda şunları kontrol edin:

### Doldurulmuş mu?
- [ ] Package yüklendi mi? (menuslide-roku.zip)
- [ ] Channel Poster (540x405) var mı?
- [ ] Description yazıldı mı?
- [ ] Support email var mı?
- [ ] Privacy Policy URL var mı?
- [ ] Category seçildi mi?
- [ ] Screenshots var mı? (3+ adet)

### Eksikse Ne Yapmalı?
1. İlgili sekmeye git
2. Bilgiyi/dosyayı ekle
3. Save/Submit

---

## 📸 Screenshot Alma (Henüz Yoksa)

### Yöntem 1: Roku Cihazda
```
1. Roku'da MenuSlide uygulamasını yükle (sideload)
2. Farklı template'leri göster
3. Roku remote: Home x5 (5 kez Home)
4. Developer Settings → Screenshot Utility
5. USB'ye kaydet
```

### Yöntem 2: Fotoğraf
```
1. TV ekranından kaliteli fotoğraf çek
2. Bilgisayarda 1920x1080'e resize et
3. Parlaklık/kontrast ayarla
```

### Önerilen Screenshot'lar:
1. Hamburger menü (fiyatlar + görseller)
2. Kahve/içecek menü
3. Promosyon/kampanya
4. Çoklu ürün listesi
5. Aktivasyon ekranı (opsiyonel)

---

## 🚀 Private Channel Test

### Access Code Alma
```
Channel yayınlandıktan sonra:
→ Developer Portal → MenuSlide
→ "Access Code" görünür (örn: ABCD1234)
```

### Roku'ya Yükleme
```
1. https://my.roku.com/account/add
2. Access Code gir: ABCD1234
3. "Add Channel" tıkla
4. Roku'da görünür
```

### Test Checklist
- [ ] Uygulama açılıyor mu?
- [ ] Aktivasyon kodu çalışıyor mu?
- [ ] Template'ler görünüyor mu?
- [ ] Slide geçişleri düzgün mü?
- [ ] Crash/donma yok mu?
- [ ] İçerik güncellemeleri çalışıyor mu?

---

## 📊 Public'e Geçiş (Test Sonrası)

### Ne Zaman?
- ✅ 1-2 hafta private test tamamlandı
- ✅ Hiçbir kritik bug yok
- ✅ Müşteri geri bildirimleri olumlu
- ✅ Screenshot'lar yüklendi
- ✅ Privacy policy yayında

### Nasıl?
```
→ Developer Portal → MenuSlide
→ "Convert to Public" butonu
→ Eksik bilgileri tamamla
→ "Submit for Review"
→ 3-7 gün bekle
→ Email ile sonuç bildirilir
```

---

## ⚠️ Önemli Notlar

1. **Package zorunlu** - Önce package yükleyin
2. **Görseller zorunlu** - En az Channel Poster (540x405)
3. **Description zorunlu** - İngilizce olmalı
4. **Privacy Policy** - Public için zorunlu, Private için önerilir
5. **Screenshot'lar** - Public için zorunlu (3+ adet)

---

## 🆘 Sorun Çözme

**"Package required" hatası?**
→ Package sekmesine git, menuslide-roku.zip yükle

**"Invalid image size" hatası?**
→ Görsel boyutları kontrol et: 540x405, 290x218, vb.

**"Privacy policy required" hatası?**
→ Basit bir sayfa oluştur ve URL'i gir

**"Screenshots required" hatası?**
→ En az 3 adet 1920x1080 ekran görüntüsü yükle

---

## 📞 Yardım

- **Roku Forum**: https://community.roku.com/
- **Email**: developer@roku.com
- **Detaylı Rehber**: roku-publishing-guide.md

---

## ✅ Hızlı Checklist

- [ ] MenuSlide uygulamasını aç (3 nokta menü)
- [ ] Package yükle (menuslide-roku.zip)
- [ ] Görselleri yükle (4 adet)
- [ ] Description yaz
- [ ] Privacy Policy URL ekle
- [ ] Category seç (Business)
- [ ] Screenshot'ları yükle (3-5 adet)
- [ ] Channel Type: Private
- [ ] Monetization: Free
- [ ] Save/Publish
- [ ] Access Code al
- [ ] Test et
- [ ] Public yap (opsiyonel)

---

**ŞİMDİ**: MenuSlide uygulamasını açın ve package yükleyin! 🚀

**Dosya**: `/Users/admin/Desktop/Tvproje/roku-tv/menuslide-roku.zip`
