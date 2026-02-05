# 🎨 Template Oluşturma ve Yönetim Sistemi

## 📋 Sistem Özeti

Kullanıcılar kendi template'lerini oluşturabilir, düzenleyebilir ve TV ekranlarına atayabilir.

---

## 🚀 Özellikler

### 1. **Template Oluşturma Sayfası** (`/templates/new`)

Kullanıcı yeni bir template oluşturur:

#### **Adımlar:**
1. **Template Adı Gir**: Örn: "Pizza Menü Template"
2. **Açıklama Ekle** (Opsiyonel): Kısa açıklama
3. **Grid Düzeni Seç**:
   - 2x2 Grid (4 blok)
   - 3x3 Grid (9 blok)
   - 4x4 Grid (16 blok)
   - 2x3 Grid (6 blok)
   - 3x2 Grid (6 blok)
   - 1x2 Grid (2 blok)
4. **"Template Oluştur ve Düzenle"** butonuna tıkla
5. Otomatik olarak düzenleme sayfasına yönlendirilir

#### **Backend İşlemi:**
- Template oluşturulur (`POST /templates`)
- Seçilen grid'e göre otomatik olarak bloklar oluşturulur
- Her blok eşit boyutlarda ve grid düzeninde konumlandırılır

---

### 2. **Template Düzenleme Sayfası** (`/templates/[id]/edit`)

Template'e içerik eklenir:

#### **Sol Panel: İçerik Kütüphanesi**
- 🍕 Yiyecekler (Pizza, Burger, Makarna, vs.)
- 🥤 İçecekler (Kahve, Çay, Smoothie, vs.)
- 🍰 Tatlılar (Pasta, Dondurma, vs.)
- 🎨 İkonlar (Emoji ve simgeler)
- 🏷️ Rozetler (Yeni, İndirim, Popüler, vs.)
- 🎨 Arka Planlar (Renkler ve gradyanlar)
- 📝 Metin Şablonları

#### **Sağ Panel: Önizleme ve Bilgi Kartları**

**Üst Kısım - Bilgi Kartları:**
- **Seçili Blok Kartı**: Blok bilgileri (pozisyon, boyut)
- **Yardım Kartı**: Kullanım talimatları

**Alt Kısım - Önizleme:**
- Tüm bloklar görünür
- Bloklar sürüklenip yeniden boyutlandırılabilir
- Seçili blok mavi kenarlıkla vurgulanır

#### **Kullanım Akışı:**
1. Önizlemede bir blok seç
2. Sol menüden içerik seç (resim, ikon, vs.)
3. İçerik otomatik olarak bloğa eklenir
4. Bitince üstteki "💾 Kaydet" butonuna tıkla
5. Template'ler listesine dönülür

---

### 3. **Template'ler Listesi** (`/templates`)

Tüm template'ler görüntülenir:

#### **Sekmeler:**
- **Sistem Template'leri**: Hazır template'ler
- **Benim Template'lerim**: Kullanıcının oluşturduğu template'ler

#### **Her Template Kartında:**
- Önizleme görseli
- Template adı ve açıklaması
- Blok sayısı
- Oluşturulma tarihi (kullanıcı template'leri için)

#### **Aksiyonlar:**
- **Uygula**: Bir ekrana template uygula
- **📋 Kopyala**: Template'i kopyala
- **🗑️ Sil**: Template'i sil (sadece kullanıcı template'leri)

---

### 4. **Ekran Yönetimi** (`/screens/[id]/template`)

Template'ler ekranlara atanır:

#### **Mevcut Özellikler:**
- Template seçimi (dropdown)
- AI ile template oluşturma
- Blokları düzenleme
- İçerik ekleme

#### **Gelecek Özellik: Çoklu Template Döngüsü**
Kullanıcı birden fazla template seçebilir ve bunlar belirli sürede döner:

**Örnek Senaryo:**
1. Kullanıcı 3 template oluşturdu:
   - "Kahvaltı Menüsü"
   - "Öğle Yemeği Menüsü"
   - "Akşam Yemeği Menüsü"

2. Ekran yönetiminde:
   - TV1 için: Template 1, 2, 3 seçilir
   - Döngü süresi: 30 saniye
   - TV1'de her 30 saniyede bir template değişir

3. Birden fazla TV:
   - TV1: Template 1, 2, 3 (30 sn döngü)
   - TV2: Template 1, 4 (20 sn döngü)
   - TV3: Sadece Template 2 (sabit)

---

## 🔧 Teknik Detaylar

### **Backend Endpoint'ler:**

#### **Templates:**
- `GET /templates` - Tüm template'leri listele
- `GET /templates/:id` - Template detayı
- `GET /templates/:id/blocks` - Template bloklarını getir
- `POST /templates` - Yeni template oluştur
- `PATCH /templates/:id` - Template güncelle
- `DELETE /templates/:id` - Template sil
- `GET /templates/scope/:scope` - Scope'a göre filtrele (system/user)

#### **Template Blocks:**
- `GET /template-blocks/:id` - Blok detayı
- `GET /template-blocks/template/:templateId` - Template'e ait bloklar
- `POST /template-blocks` - Yeni blok oluştur
- `PATCH /template-blocks/:id` - Blok güncelle
- `DELETE /template-blocks/:id` - Blok sil

#### **Template Block Contents:**
- `GET /template-block-contents/:id` - İçerik detayı
- `GET /template-block-contents/block/:blockId` - Bloğa ait içerikler
- `POST /template-block-contents` - Yeni içerik ekle
- `PATCH /template-block-contents/:id` - İçerik güncelle
- `DELETE /template-block-contents/:id` - İçerik sil

### **Database Tabloları:**

#### **templates:**
```sql
- id (UUID, PK)
- name (string, unique)
- display_name (string)
- description (text, nullable)
- block_count (integer)
- preview_image_url (string, nullable)
- scope ('system' | 'user')
- business_id (UUID, nullable, FK)
- is_active (boolean, default: true)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **template_blocks:**
```sql
- id (UUID, PK)
- template_id (UUID, FK)
- block_index (integer)
- position_x (decimal)
- position_y (decimal)
- width (decimal)
- height (decimal)
- style_config (jsonb)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **template_block_contents:**
```sql
- id (UUID, PK)
- template_block_id (UUID, FK)
- content_type (string) -- 'image', 'icon', 'text', 'badge', 'background'
- title (string, nullable)
- image_url (string, nullable)
- icon_name (string, nullable)
- text_color (string, nullable)
- background_color (string, nullable)
- background_gradient (string, nullable)
- badge_style (string, nullable)
- display_order (integer, default: 0)
- created_at (timestamp)
- updated_at (timestamp)
```

---

## 🎯 Kullanım Senaryoları

### **Senaryo 1: Pizza Restoranı**

1. **Template Oluştur:**
   - Ad: "Pizza Menü"
   - Grid: 3x3 (9 blok)

2. **İçerik Ekle:**
   - Blok 1: Logo (ikon)
   - Blok 2-7: Pizza resimleri
   - Blok 8: "Yeni" rozeti
   - Blok 9: İletişim bilgisi (metin)

3. **Kaydet ve Uygula:**
   - TV1'e ata
   - Ekranda görüntüle

### **Senaryo 2: Cafe - Çoklu Template Döngüsü**

1. **3 Template Oluştur:**
   - "Kahve Menüsü" (2x2)
   - "Tatlı Menüsü" (2x3)
   - "Özel Kampanya" (1x2)

2. **Ekran Yönetimi:**
   - TV1: 3 template'i seç
   - Döngü: 20 saniye
   - Otomatik geçiş

3. **Sonuç:**
   - Her 20 saniyede bir template değişir
   - Müşteriler tüm menüleri görür

---

## 📊 Avantajlar

### **Kullanıcı İçin:**
- ✅ Kolay template oluşturma
- ✅ Sürükle-bırak ile düzenleme
- ✅ Hazır içerik kütüphanesi
- ✅ Canlı önizleme
- ✅ Çoklu template desteği
- ✅ Otomatik döngü sistemi

### **İşletme İçin:**
- ✅ Hızlı menü güncelleme
- ✅ Profesyonel görünüm
- ✅ Zaman tasarrufu
- ✅ Marka tutarlılığı
- ✅ Esnek içerik yönetimi

---

## 🔮 Gelecek Geliştirmeler

### **Faz 1: Temel Sistem** ✅
- Template oluşturma
- İçerik ekleme
- Düzenleme ve kaydetme

### **Faz 2: Gelişmiş Özellikler** (Planlanan)
- 🔄 Çoklu template döngüsü
- ⏰ Zamanlama (sabah/öğle/akşam template'leri)
- 📱 Mobil önizleme
- 🎨 Daha fazla içerik türü
- 📊 Template istatistikleri
- 🔗 Template paylaşımı
- 🎬 Animasyon desteği

### **Faz 3: Entegrasyonlar** (Gelecek)
- 🤖 AI ile otomatik içerik önerisi
- 📸 Görsel yükleme ve düzenleme
- 🌐 Çoklu dil desteği
- 💳 Premium template marketi
- 📈 A/B testing

---

## 🎓 Kullanım Kılavuzu

### **Yeni Template Oluşturma:**

1. Dashboard'da "Template'ler" menüsüne tıkla
2. "✨ Yeni Template Oluştur" butonuna tıkla
3. Template adı gir
4. Grid düzeni seç
5. "Template Oluştur ve Düzenle" butonuna tıkla

### **Template Düzenleme:**

1. Önizlemede bir blok seç (mavi kenarlık görünür)
2. Sol menüden içerik seç:
   - Resim için: Yiyecekler/İçecekler/Tatlılar
   - İkon için: İkonlar
   - Rozet için: Rozetler
   - Arka plan için: Arka Planlar
3. İçerik otomatik olarak bloğa eklenir
4. Diğer bloklar için tekrarla
5. Üstteki "💾 Kaydet" butonuna tıkla

### **Template Uygulama:**

1. Template'ler sayfasında template kartındaki "Uygula" butonuna tıkla
2. Ekran seç
3. "Mevcut içeriği koru" seçeneğini işaretle (isteğe bağlı)
4. "Uygula" butonuna tıkla
5. Ekran sayfasına yönlendirilir

---

## 🎉 Sonuç

Bu sistem ile kullanıcılar:
- Kendi template'lerini oluşturabilir
- Profesyonel görünümlü menüler tasarlayabilir
- Hızlıca içerik ekleyip düzenleyebilir
- Birden fazla ekrana farklı template'ler atayabilir
- Gelecekte çoklu template döngüsü ile dinamik içerik gösterebilir

**Sistem tamamen hazır ve kullanıma hazır!** 🚀
