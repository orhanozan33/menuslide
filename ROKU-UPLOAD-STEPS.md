# Roku MenuSlide - Upload Adımları (Şu An)

## 📍 Mevcut Durum
- Channel ID: 850721
- Access Code: RHPDKNB ✅
- Version: N/A ⚠️ (Package yüklenmemiş)
- URL: https://developer.roku.com/apps/public/850721/overview

---

## 🎯 ADIM 1: App Package Yükle (EN ÖNEMLİ)

### 1.1 Package Sekmesine Git
```
Sol menüden veya sayfadaki:
→ "Package & testing" bölümü
→ "App package" linkine tıkla
```

### 1.2 Package Yükle
```
→ "Upload package" butonu
→ Dosya seç: /Users/admin/Desktop/Tvproje/roku-tv/menuslide-roku.zip
→ Version: 1.0.24
→ Minimum Roku OS Version: 10.0 (önerilir)
→ Release notes: "Initial release - MenuSlide Digital Signage"
→ Submit/Upload
```

### 1.3 Doğrulama
```
✅ Package validation başarılı olmalı
✅ Version: 1.0.24 görünmeli
✅ Package size: ~3.5 MB
```

---

## 🎯 ADIM 2: Store Assets (Görseller)

### 2.1 Store Assets Sekmesine Git
```
Sol menüden veya "Store listing" bölümünden:
→ "Store assets" linkine tıkla
```

### 2.2 Görselleri Yükle

#### Channel Poster (Zorunlu) - 540x405
```
Dosya: /Users/admin/Desktop/Tvproje/roku-tv/images/icon-focus-fhd.png
Boyut: 540x405 piksel
Format: PNG
```

#### Channel Icon - 290x218
```
Dosya: /Users/admin/Desktop/Tvproje/roku-tv/images/icon-focus.png
Boyut: 290x218 piksel
Format: PNG
```

#### Side Icon HD - 214x144
```
Dosya: /Users/admin/Desktop/Tvproje/roku-tv/images/icon-side-214x144.png
Boyut: 214x144 piksel
Format: PNG
```

#### Side Icon SD - 108x69
```
Dosya: /Users/admin/Desktop/Tvproje/roku-tv/images/icon-side-108x69.png
Boyut: 108x69 piksel
Format: PNG
```

### 2.3 Screenshots Ekle
```
"Add screenshots" butonu
→ 3-5 adet ekran görüntüsü yükle
→ Boyut: 1920x1080 (FHD)
→ Format: PNG veya JPG

ÖNEMLİ: Screenshot'lar henüz yoksa:
1. Roku'da uygulamayı sideload edin
2. Farklı template'leri gösterin
3. Fotoğraf çekin veya Roku screenshot alın
4. 1920x1080'e resize edin
```

---

## 🎯 ADIM 3: Listing Setup (Açıklama ve Bilgiler)

### 3.1 Listing Setup Sekmesine Git
```
"Store listing" bölümünden:
→ "Listing setup" linkine tıkla
```

### 3.2 Temel Bilgileri Doldur

#### Channel Name
```
MenuSlide Digital Signage
```

#### Developer Name
```
[Şirketiniz veya adınız]
Örnek: MenuSlide Inc.
```

#### Short Description (kısa açıklama)
```
Professional digital menu board solution for restaurants and retail stores.
```

#### Long Description (uzun açıklama)
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

#### Categories
```
Primary Category: Business
Secondary Category: Food & Drink (opsiyonel)
```

#### Languages
```
Primary: English
Additional: Turkish (opsiyonel)
```

#### Countries/Regions
```
Worldwide (veya spesifik: Canada, United States, Turkey)
```

---

## 🎯 ADIM 4: App Profile (Uygulama Özellikleri)

### 4.1 App Profile Sekmesine Git
```
"App properties" bölümünden:
→ "App profile" linkine tıkla
```

### 4.2 App Type
```
App type: Channel
```

### 4.3 Privacy & Terms

#### Privacy Policy URL (Zorunlu)
```
https://menuslide.com/privacy

ÖNEMLİ: Bu sayfa henüz yoksa basit bir privacy policy oluşturun.
Şablon: roku-publishing-guide.md dosyasında mevcut.

Basit içerik:
- Kişisel veri toplamıyoruz
- Sadece business içerik gösteriyoruz
- İnternet gerekli
- Support: support@menuslide.com
```

#### Terms of Service URL (Opsiyonel)
```
https://menuslide.com/terms (varsa)
```

### 4.4 Account Requirement
```
Account required: No
(Cihaz aktivasyon kodu ile çalışıyor)
```

### 4.5 Customer Support Info

#### Support Email
```
support@menuslide.com
```

#### Support Website
```
https://menuslide.com
```

#### Support Phone (Opsiyonel)
```
[Telefon numaranız varsa]
```

---

## 🎯 ADIM 5: Monetization Setup

### 5.1 Monetization Sekmesine Git
```
"App properties" bölümünden:
→ "Monetization setup" linkine tıkla
```

### 5.2 Monetization Model
```
Model: Free (ücretsiz)

Not: Para kazanma menuslide.com web platformu üzerinden
(SaaS abonelik modeli). Roku'da uygulama ücretsiz.
```

---

## 🎯 ADIM 6: Content Rating

### 6.1 Content Rating Sekmesine Git
```
"Store listing" bölümünden content rating seçeneğini bulun
```

### 6.2 Rating Seç
```
Content Rating: No Rating (veya G - General Audience)

Neden: Ticari/business içerik, yaş kısıtlaması gerektirmiyor
```

---

## 🎯 ADIM 7: Deep Linking (Opsiyonel)

### 7.1 Deep Linking Sekmesi
```
"Package & testing" bölümünden:
→ "Deep linking" (gerekirse)
```

### 7.2 Ayarlar
```
Deep linking: Disabled (şimdilik gerekli değil)
```

---

## 🎯 ADIM 8: Static Analysis (Opsiyonel)

### 8.1 Static Analysis
```
"Package & testing" bölümünden:
→ "Static analysis"
```

### 8.2 Çalıştır
```
→ "Run analysis" butonu
→ Kod kalitesi kontrolü
→ Uyarıları kontrol edin (kritik değilse devam)
```

---

## 🎯 ADIM 9: Publish / Submit

### 9.1 Tüm Adımlar Tamamlandı mı?
```
✅ Package yüklendi (v1.0.24)
✅ Store assets (görseller) yüklendi
✅ Screenshots eklendi (3+ adet)
✅ Listing setup tamamlandı (description, vb.)
✅ App profile tamamlandı (privacy policy, support)
✅ Monetization: Free seçildi
✅ Content rating seçildi
```

### 9.2 Private Channel Olarak Yayınla
```
→ Sayfanın üst kısmında "Publish" veya "Submit" butonu
→ Channel type: Private (test için)
→ Publish/Submit tıkla
```

### 9.3 Başarı!
```
✅ Channel yayına girer (hemen, review yok)
✅ Access Code: RHPDKNB (zaten mevcut)
✅ Status: Published (Private)
```

---

## 🎯 ADIM 10: Test Et

### 10.1 Roku'ya Yükle
```
Yöntem 1: Web üzerinden
→ https://my.roku.com/account/add
→ Access Code: RHPDKNB
→ Add Channel

Yöntem 2: Roku cihazda
→ Settings → System → System Update
→ Channel Store → Add Channel by Code
→ Kod: RHPDKNB
```

### 10.2 Test Checklist
```
- [ ] Uygulama açılıyor mu?
- [ ] Aktivasyon kodu ekranı görünüyor mu?
- [ ] menuslide.com'dan kod alıp girebiliyor musunuz?
- [ ] Template'ler görünüyor mu?
- [ ] Slide geçişleri düzgün mü?
- [ ] Mavi ekran sorunu çözüldü mü?
- [ ] İçerik güncellemeleri çalışıyor mu?
- [ ] Crash/donma yok mu?
```

---

## 🎯 ADIM 11: Public'e Geçiş (Opsiyonel)

### 11.1 Ne Zaman?
```
✅ 1-2 hafta private test tamamlandı
✅ Hiçbir kritik bug yok
✅ Müşteri geri bildirimleri olumlu
✅ Screenshot'lar kaliteli ve profesyonel
✅ Privacy policy yayında
```

### 11.2 Nasıl?
```
→ Developer Portal → MenuSlide (850721)
→ "Convert to Public" butonu (veya benzer)
→ Eksik bilgileri tamamla
→ "Submit for Review"
→ 3-7 gün review süreci
→ Email ile sonuç bildirilir
```

---

## ⚠️ Önemli Notlar

### Package Yükleme
- ✅ Dosya: menuslide-roku.zip (3.5 MB)
- ✅ Version: 1.0.24
- ✅ Minimum Roku OS: 10.0

### Görseller
- ✅ Tüm boyutlar doğru (540x405, 290x218, 214x144, 108x69)
- ✅ MenuSlide Canada logosu kullanıldı
- ✅ Profesyonel görünüm

### Privacy Policy
- ⚠️ Henüz yoksa MUTLAKA oluşturun
- ⚠️ Basit olabilir ama olmalı
- ⚠️ Public channel için zorunlu

### Screenshots
- ⚠️ Henüz yoksa Roku'da test ederken alın
- ⚠️ En az 3 adet (1920x1080)
- ⚠️ Farklı template'leri gösterin

---

## 🆘 Sorun Çözme

**"Package validation failed"?**
→ manifest dosyasını kontrol edin
→ Icon boyutları doğru mu?
→ Dosya 10 MB'dan küçük mü? (bizimki 3.5 MB ✅)

**"Privacy policy required"?**
→ Basit bir sayfa oluşturun
→ URL'i App Profile'da girin

**"Screenshots required"?**
→ En az 3 adet yükleyin (1920x1080)

**"Invalid image size"?**
→ Boyutları tam olmalı: 540x405, 290x218, vb.

---

## ✅ Hızlı Checklist

### ŞİMDİ YAPIN (Öncelik Sırası):
1. [ ] **App package** yükle → menuslide-roku.zip
2. [ ] **Store assets** → 4 adet görsel yükle
3. [ ] **Screenshots** → 3-5 adet ekran görüntüsü (varsa)
4. [ ] **Listing setup** → Description, category, vb.
5. [ ] **App profile** → Privacy policy URL, support email
6. [ ] **Monetization** → Free seç
7. [ ] **Content rating** → No Rating veya G
8. [ ] **Publish** → Private channel olarak yayınla
9. [ ] **Test** → Access code: RHPDKNB ile test et

### SONRA YAPIN:
10. [ ] 1-2 hafta test et
11. [ ] Screenshot'ları çek (henüz yoksa)
12. [ ] Public'e geçiş (opsiyonel)

---

## 📞 Yardım

- **Roku Forum**: https://community.roku.com/
- **Email**: developer@roku.com
- **Detaylı Rehber**: roku-publishing-guide.md

---

**ŞİMDİ**: "App package" linkine tıklayın ve menuslide-roku.zip yükleyin! 🚀

**Dosya Yolu**: `/Users/admin/Desktop/Tvproje/roku-tv/menuslide-roku.zip`
