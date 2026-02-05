# Yereldeki Tüm Veriyi Canlıya Taşıma (Tek Rehber)

Yerelde oluşturduğunuz **kullanıcılar, işletmeler, menüler, ekranlar, şablonlar, resimler, videolar** hepsini canlı (Supabase + production) ortamda kullanmak için bu adımları **sırayla** uygulayın.

---

## Ön koşul

- **Yerelde** PostgreSQL’de **tvproje** veritabanı dolu (kullanıcılar, işletmeler, menüler, ekranlar, şablonlar, content_library vb. hepsi burada).
- **Canlıda** Supabase projesi var ve **şema çalıştırılmış** (tablolar mevcut). Şema yoksa önce `database/SUPABASE_MIGRATION_SIRASI.md` veya `database/supabase-sql-editor-full.sql` ile oluşturun.
- Bu adımları **yerel verinin olduğu bilgisayarda** (veya yerel DB’ye erişebildiğiniz ortamda) yapın.

---

## Adım 1: Yerel veritabanından tüm veriyi export et

**Yerel verinin olduğu bilgisayarda** proje kökünde (Tvproje) terminali açın:

```bash
cd /Users/admin/Desktop/Tvproje
chmod +x scripts/export-local-to-supabase.sh
./scripts/export-local-to-supabase.sh
```

- Şifre isterse `backend/.env` içindeki `DB_PASSWORD` değerini girin.
- Çıktı dosyası: **`database/export-from-local-data.sql`**
- Script şu tabloları export eder (yerelde varsa): businesses, users, menus, menu_items, screens, screen_menu, menu_schedules, languages, menu_item_translations, plans, subscriptions, payments, templates, template_blocks, screen_blocks, template_block_contents, screen_block_contents, content_library, content_library_categories, contact_info, home_channels, screen_template_rotations, display_viewers, payment_failures, admin_permissions, admin_activity_log, screen_edit_history.

Export bittikten sonra `database/export-from-local-data.sql` dosyasının **0 satır değil**, dolu olduğundan emin olun. (0 satır ise yerel DB bağlantısı veya veritabanı adı yanlış olabilir.)

---

## Adım 2: Export dosyasını Supabase’e yükle

### Seçenek A: Dosya makul boyuttaysa (birkaç MB altı)

1. **Supabase Dashboard** → projeniz → **SQL Editor** → **New query**.
2. `database/export-from-local-data.sql` dosyasını açıp **içeriğinin tamamını** kopyalayın.
3. SQL Editor’e yapıştırıp **Run** ile çalıştırın.

### Seçenek B: Dosya büyükse — otomatik yükleme (Query is too large hatası olmaz)

1. Supabase → **Project Settings** → **Database** → **Connection string** (URI) kopyalayın. Şifreyi kendi şifrenizle değiştirin.
2. Yerelde (export’u aldığınız bilgisayarda):

```bash
export SUPABASE_IMPORT_URL="postgresql://postgres:SIFRENIZ@db.xxxx.supabase.co:5432/postgres"
./scripts/import-to-supabase.sh
```

Böylece tüm INSERT’ler Supabase’e uygulanır.

### Duplicate key hatası alırsanız

Supabase’de bazı tablolarda zaten kayıt varsa “duplicate key” alabilirsiniz. İki yol:

- **Sıfırdan yüklemek istiyorsanız** (canlıdaki mevcut veriyi silip yerel veriyi tek kaynak yapacaksanız) önce aşağıdaki TRUNCATE’i **dikkatle** Supabase SQL Editor’da çalıştırın, sonra Adım 2’yi tekrarlayın:

```sql
TRUNCATE
  screen_edit_history, admin_activity_log, admin_permissions, payment_failures,
  display_viewers, screen_template_rotations, home_channels, contact_info,
  content_library_categories, content_library,
  screen_block_contents, template_block_contents, screen_blocks, template_blocks,
  templates, payments, subscriptions, plans, menu_item_translations, languages,
  menu_schedules, screen_menu, screens, menu_items, menus, users, businesses
RESTART IDENTITY CASCADE;
```

- Sadece **eksik veriyi** eklemek istiyorsanız, duplicate key veren tabloları atlayıp sadece yeni kayıtları ekleyecek şekilde SQL’i düzenleyebilir veya o tabloları TRUNCATE edip sadece onları tekrar import edebilirsiniz.

---

## Adım 3: Resim ve videoları canlıya taşıma

Veritabanında **image_url**, **video_url**, **background_image_url**, **logo_url**, **preview_image_url**, **url** gibi alanlar **dosya yolu** veya **localhost** URL’i tutuyor olabilir. Bunları canlıda çalışır hale getirmek için iki kısım var: **dosyaları yüklemek** ve **veritabanındaki URL’leri güncellemek**.

### 3a. Yerel dosyaları Supabase Storage’a yüklemek

1. Yerelde **resim/video dosyalarının** nerede olduğunu bulun. Genelde:
   - Backend’in **uploads** klasörü (örn. `backend/uploads/` veya proje kökünde `uploads/`),
   - veya veritabanındaki URL’lerde geçen path’e bakarak (örn. `http://localhost:3001/uploads/...`).
2. Supabase → **Storage** → **New bucket** (gerekirse) → örn. adı **uploads**, public olsun.
3. Bu klasördeki **tüm dosya ve alt klasörleri** Supabase Storage’daki **uploads** bucket’ına yükleyin (sürükle-bırak veya “Upload file(s)” ile). Mümkünse yereldeki klasör yapısını koruyun (örn. `uploads/2024/01/xxx.jpg` → Storage’da da aynı path).

### 3b. Veritabanındaki URL’leri güncellemek

Resim/video dosyalarını Storage’a yükledikten sonra, veritabanında **localhost** veya **yerel path** içeren URL’leri Supabase Storage public URL’ine çevirin.

Supabase’de **SQL Editor** → **New query** → aşağıdaki SQL’i yapıştırın. **`PROJE_REF`** ve **`uploads`** kısımlarını kendi projenize göre değiştirin (Supabase Dashboard → Project Settings → General → Reference ID; Storage’daki bucket adı).

```sql
-- PROJE_REF: Supabase proje referansı (Project Settings → General)
-- Örnek: https://abcdefghijk.supabase.co → PROJE_REF = abcdefghijk
-- Bucket adı uploads ise aşağıdaki gibi bırakın; farklıysa değiştirin.

-- menu_items: ürün resimleri
UPDATE menu_items
SET image_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(image_url FROM '[^/]+$')
WHERE image_url IS NOT NULL AND (image_url LIKE '%localhost%' OR image_url LIKE '%/uploads/%');

-- screens: arka plan ve logo
UPDATE screens
SET background_image_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(background_image_url FROM '[^/]+$')
WHERE background_image_url IS NOT NULL AND (background_image_url LIKE '%localhost%' OR background_image_url LIKE '%/uploads/%');

UPDATE screens
SET logo_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(logo_url FROM '[^/]+$')
WHERE logo_url IS NOT NULL AND (logo_url LIKE '%localhost%' OR logo_url LIKE '%/uploads/%');

-- businesses: QR arka plan
UPDATE businesses
SET qr_background_image_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(qr_background_image_url FROM '[^/]+$')
WHERE qr_background_image_url IS NOT NULL AND (qr_background_image_url LIKE '%localhost%' OR qr_background_image_url LIKE '%/uploads/%');

-- content_library: resim/video URL
UPDATE content_library
SET url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(url FROM '[^/]+$')
WHERE url IS NOT NULL AND (url LIKE '%localhost%' OR url LIKE '%/uploads/%');

-- screen_block_contents: blok resimleri (kolon varsa)
UPDATE screen_block_contents
SET image_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(image_url FROM '[^/]+$')
WHERE image_url IS NOT NULL AND (image_url LIKE '%localhost%' OR image_url LIKE '%/uploads/%');

UPDATE screen_block_contents
SET background_image_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(background_image_url FROM '[^/]+$')
WHERE background_image_url IS NOT NULL AND (background_image_url LIKE '%localhost%' OR background_image_url LIKE '%/uploads/%');

-- template_block_contents: şablon blok resimleri
UPDATE template_block_contents
SET image_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(image_url FROM '[^/]+$')
WHERE image_url IS NOT NULL AND (image_url LIKE '%localhost%' OR image_url LIKE '%/uploads/%');

-- templates: önizleme resmi
UPDATE templates
SET preview_image_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(preview_image_url FROM '[^/]+$')
WHERE preview_image_url IS NOT NULL AND (preview_image_url LIKE '%localhost%' OR preview_image_url LIKE '%/uploads/%');
```

- **PROJE_REF** yerine kendi Supabase proje referansınızı (URL’deki `db.xxxx.supabase.co` içindeki `xxxx` veya dashboard’daki Reference ID) yazın.
- Storage’da dosyaları **alt klasörle** (örn. `uploads/2024/01/xxx.jpg`) yüklediyseniz, sadece dosya adı yerine path’i de koruyacak şekilde `SUBSTRING(...)` kısmını kendi path’inize göre uyarlayın.
- Bir tabloda ilgili kolon yoksa “column does not exist” alabilirsiniz; o UPDATE satırını silin veya yorum satırı yapıp tekrar çalıştırın.

---

## Adım 4: Kontrol

- Supabase → **Table Editor** → `users`, `businesses`, `menus`, `screens`, `templates`, `content_library` vb. satır sayılarının yereldekiyle mantıklı şekilde eşleştiğini kontrol edin.
- Canlı uygulamada **giriş** yapın (yerelde kullandığınız e-posta/şifre ile).
- Menüler, ekranlar, şablonlar, resimler ve videoların doğru göründüğünü kontrol edin.

---

## Kısa özet

| Ne | Nasıl |
|----|--------|
| Yerel veriyi al | Yerel verinin olduğu bilgisayarda: `./scripts/export-local-to-supabase.sh` → `database/export-from-local-data.sql` |
| Canlı DB’ye yükle | Supabase SQL Editor’da bu dosyayı çalıştır **veya** psql ile `-f database/export-from-local-data.sql` |
| Resim/video dosyaları | Yerel uploads klasörünü Supabase Storage **uploads** bucket’ına yükle |
| URL’leri düzelt | Yukarıdaki UPDATE SQL’ini kendi PROJE_REF ile Supabase’de çalıştır |

Bu rehberi sırayla uyguladığınızda yereldeki **kullanıcılar, işletmeler, menüler, ekranlar, şablonlar, resimler ve videolar** canlıda kullanılabilir hale gelir.
