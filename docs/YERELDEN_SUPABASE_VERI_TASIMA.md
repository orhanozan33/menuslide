# Yerel Veritabanından Supabase'e Tüm Veriyi Taşıma (Kullanıcılar, Resimler, Veriler)

Yerelde (localhost PostgreSQL) kullandığınız **tüm kullanıcılar, işletmeler, menüler, ekranlar, şablonlar ve diğer verileri** Supabase'e taşımak için aşağıdaki adımları uygulayın.

---

## Ön koşul

- Yerelde PostgreSQL'de **tvproje** (veya kullandığınız DB adı) veritabanı dolu ve çalışıyor.
- Supabase'de **şema zaten oluşturulmuş** (örn. `database/supabase-sql-editor-full.sql` çalıştırıldı).
- Supabase'de **Storage** bucket'ı (örn. `uploads`) oluşturulmuş ve public.

---

## Adım 1: Yerel veritabanından veriyi dışa aktar (sadece veri, şema değil)

Terminalde (Mac/Linux):

```bash
cd /Users/admin/Desktop/Tvproje

# Yerel DB bağlantısı (şifre: .env'daki DB_PASSWORD)
pg_dump -h localhost -p 5432 -U postgres -d tvproje \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  -t businesses \
  -t users \
  -t menus \
  -t menu_items \
  -t screens \
  -t screen_menu \
  -t menu_schedules \
  -t languages \
  -t menu_item_translations \
  -t plans \
  -t subscriptions \
  -t payments \
  -t templates \
  -t template_blocks \
  -t screen_blocks \
  -t template_block_contents \
  -t screen_block_contents \
  -t content_library \
  -t contact_info \
  -t home_channels \
  -t screen_template_rotations \
  -t content_library_categories \
  -t display_viewers \
  -t payment_failures \
  -t admin_permissions \
  -t admin_activity_log \
  -t screen_edit_history \
  > database/export-from-local-data.sql
```

Şifre isterse `.env`'daki `DB_PASSWORD` değerini girin.  
Eğer bazı tablolar yerelde yoksa (örn. `display_viewers`) o `-t` satırını kaldırın veya hata verirse o tabloyu atlayın.

---

## Adım 2: (İsteğe bağlı) ID çakışması olmasın diye sequence'leri sıfırla

Supabase'de **zaten kayıt yoksa** bu adımı atlayabilirsiniz. Varsa, export SQL'inin sonuna şunu ekleyin veya Supabase'de ayrı çalıştırın:

```sql
-- Sadece yeni eklenen tablolarda yeni ID üretirken çakışma olmasın diye (isteğe bağlı)
SELECT setval(pg_get_serial_sequence('content_library_categories', 'id'), (SELECT COALESCE(MAX(id), 1) FROM content_library_categories));
```

Çoğu tablo UUID kullandığı için buna gerek olmayabilir.

---

## Adım 3: Export dosyasını Supabase'de çalıştır

1. **Supabase Dashboard** → Projeniz → **SQL Editor**.
2. **New query**.
3. `database/export-from-local-data.sql` dosyasının içeriğini açıp **tamamını** yapıştırın.
4. **Run** ile çalıştırın.

Hata alırsanız (örn. "duplicate key") o tabloda zaten kayıt var demektir. İsterseniz önce Supabase'de ilgili tabloları `TRUNCATE ... CASCADE;` ile temizleyip tekrar import edebilirsiniz (dikkat: tüm veriyi siler).

---

## Adım 4: Resimler / dosyalar (image_url, uploads)

Veritabanında **image_url**, **background_image_url**, **logo_url** gibi alanlar **URL string** tutar. Yerelde bunlar şu türde olabilir:

- `http://localhost:3001/uploads/xxx.jpg`
- `/uploads/xxx.jpg`
- veya zaten Supabase Storage URL’i

### 4a. Yerel dosyalar varsa (backend’de uploads klasörü)

1. Backend’deki **uploads** (veya resimlerin durduğu) klasörünü bulun.
2. **Supabase** → **Storage** → **uploads** bucket’ı → **Upload file(s)** ile tüm dosyaları yükleyin (alt klasör yapısını koruyabilirsiniz).
3. Her dosya için Supabase’in verdiği **public URL** şu formda olur:  
   `https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/DOSYA_ADI`
4. Veritabanında yerel URL’leri bu public URL’lerle değiştirin:
   - Supabase SQL Editor’de örnek (kendi bucket/klasörünüze göre düzenleyin):

```sql
-- Örnek: menu_items içinde localhost URL'lerini Supabase Storage URL ile değiştir
UPDATE menu_items
SET image_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(image_url FROM '[^/]+$')
WHERE image_url LIKE '%localhost%' OR image_url LIKE '%/uploads/%';
```

(Bu örnek sadece dosya adını alıp Supabase prefix’iyle birleştirir; kendi path yapınıza göre SUBSTRING/REPLACE ile uyarlayın.)

### 4b. Resimler zaten URL ise (harici veya Supabase)

Veritabanındaki URL’ler zaten tam ve erişilebilir (Supabase Storage veya başka CDN) ise ekstra bir şey yapmanız gerekmez; taşıdığınız veri aynen çalışır.

---

## Adım 5: Kontrol

- **Supabase** → **Table Editor** → `users`, `businesses`, `menus`, `screens` vb. tablolara bakın; satır sayıları yereldekiyle aynı mı kontrol edin.
- Uygulamada **giriş** yapın (taşıdığınız e-posta/şifre ile).
- Menü, ekran, şablon ve resimlerin doğru göründüğünü kontrol edin.

---

## Kısa özet

| Ne taşınır?      | Nasıl? |
|------------------|--------|
| Kullanıcılar     | pg_dump --data-only → export SQL → Supabase SQL Editor’de Run |
| İşletmeler       | Aynı export içinde |
| Menüler, ekranlar, şablonlar, diğer tablolar | Aynı export içinde |
| Resimler (dosya) | Yerel uploads → Supabase Storage’a yükle → DB’deki URL’leri güncelle |

Böylece yerelde ne varsa (kullanıcılar, resimler, veriler) Supabase’e taşınmış olur; siz “tüm kullanıcılar resimler verileri istiyorum” dediğinizde kastettiğiniz tam da bu akış.
