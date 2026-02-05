# Yerel Veritabanından Supabase'e Tüm Veriyi Taşıma

Yerelde (localhost PostgreSQL) kullandığınız **tüm kullanıcılar, işletmeler, menüler, ekranlar, şablonlar ve diğer verileri** Supabase'e taşımak için aşağıdaki adımları uygulayın.

> **Tüm veriyi (kullanıcılar, resimler, videolar, şablonlar) canlıya taşımak için tek adım adım rehber:**  
> **`docs/YERELDEN_CANLIYA_TUM_VERI.md`** — orada export, Supabase’e yükleme ve resim/video URL güncelleme tek dokümanda.

---

## Ön koşul

- Yerelde PostgreSQL'de **tvproje** (veya `backend/.env` içindeki `DB_NAME`) veritabanı dolu ve çalışıyor.
- Supabase'de **şema zaten oluşturulmuş** (örn. `database/supabase-sql-editor-full.sql` veya `SUPABASE_MIGRATION_SIRASI.md` ile).
- İsteğe bağlı: Supabase'de **Storage** bucket'ı (örn. `uploads`) oluşturulmuş ve public (resimler için).

---

## Adım 1: Yereldeki tüm veriyi tek komutla export et

Proje kökünde (Tvproje) terminalde:

```bash
chmod +x scripts/export-local-to-supabase.sh
./scripts/export-local-to-supabase.sh
```

- Script `backend/.env` içinden `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` okur (yoksa varsayılan: localhost, tvproje, postgres).
- Şifre isterse `.env`'daki `DB_PASSWORD` değerini girin.
- Çıktı: **`database/export-from-local-data.sql`** — tüm tabloların verisi (INSERT'ler).

Export edilen tablolar: businesses, users, menus, menu_items, screens, screen_menu, menu_schedules, languages, menu_item_translations, plans, subscriptions, payments, templates, template_blocks, screen_blocks, template_block_contents, screen_block_contents, content_library, content_library_categories, contact_info, home_channels, screen_template_rotations, display_viewers, payment_failures, admin_permissions, admin_activity_log, screen_edit_history. Yerelde olmayan tablolar atlanır.

---

## Adım 2: Export dosyasını Supabase'e yükle

### 2a. Dosya makul boyuttaysa (birkaç MB altı): SQL Editor

1. **Supabase Dashboard** → Projeniz → **SQL Editor**.
2. **New query**.
3. `database/export-from-local-data.sql` dosyasını açıp **tamamını** kopyalayıp yapıştırın.
4. **Run** ile çalıştırın.

### 2b. Dosya çok büyükse: psql ile doğrudan Supabase’e bağlan

1. Supabase → **Project Settings** → **Database** → **Connection string** (URI, Transaction modunda port **5432** veya Session modunda **6543**).
2. Yerelde:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres" -f database/export-from-local-data.sql
```

Şifreyi URL’de `[YOUR-PASSWORD]` yerine yazın (özel karakterler için URL-encode gerekebilir).

---

## Adım 3: (İsteğe bağlı) Çakışma / duplicate key

- Supabase’de **zaten kayıt yoksa** ek işlem gerekmez.
- **“duplicate key”** alırsanız: o tabloda veri vardır. Ya o tabloyu önce temizleyip tekrar import edin, ya da sadece eksik tabloları manuel ekleyin.
- Tüm veriyi silip sıfırdan yüklemek isterseniz (dikkat: tüm veriyi siler):

```sql
-- Sadece gerekirse; tüm uygulama verisini siler
TRUNCATE users, businesses, menus, menu_items, screens, screen_menu, menu_schedules,
  languages, menu_item_translations, plans, subscriptions, payments,
  templates, template_blocks, screen_blocks, template_block_contents, screen_block_contents,
  content_library, content_library_categories, contact_info, home_channels,
  screen_template_rotations, display_viewers, payment_failures, admin_permissions,
  admin_activity_log, screen_edit_history RESTART IDENTITY CASCADE;
```

Sonra Adım 2’yi tekrarlayın.

---

## Adım 4: Resimler / dosyalar (image_url, uploads)

Veritabanında **image_url**, **background_image_url**, **logo_url** gibi alanlar **URL string** tutar. Yerelde bunlar şu türde olabilir:

- `http://localhost:3001/uploads/xxx.jpg`
- `/uploads/xxx.jpg`

### 4a. Yerel dosyalar varsa (backend’de uploads klasörü)

1. Backend’deki **uploads** (veya resimlerin durduğu) klasörünü bulun.
2. **Supabase** → **Storage** → **uploads** bucket’ı → **Upload file(s)** ile tüm dosyaları yükleyin (alt klasör yapısını koruyabilirsiniz).
3. Public URL formu: `https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/DOSYA_ADI`
4. Veritabanında yerel URL’leri bu public URL’lerle güncelleyin (Supabase SQL Editor’de):

```sql
-- Örnek: menu_items içinde localhost URL'lerini Supabase Storage URL ile değiştir
UPDATE menu_items
SET image_url = 'https://PROJE_REF.supabase.co/storage/v1/object/public/uploads/' || SUBSTRING(image_url FROM '[^/]+$')
WHERE image_url LIKE '%localhost%' OR image_url LIKE '%/uploads/%';
```

(Bucket adı ve path yapınıza göre `PROJE_REF` ve path’i uyarlayın.)

### 4b. Resimler zaten tam URL ise (harici veya Supabase)

Veritabanındaki URL’ler zaten erişilebilir ise ekstra bir şey yapmanız gerekmez.

---

## Adım 5: Kontrol

- **Supabase** → **Table Editor** → `users`, `businesses`, `menus`, `screens` vb. satır sayılarını kontrol edin.
- Uygulamada **giriş** yapın (taşıdığınız e-posta/şifre ile).
- Menü, ekran, şablon ve resimlerin doğru göründüğünü kontrol edin.

---

## Kısa özet

| Ne yapılır?        | Nasıl? |
|--------------------|--------|
| Yerel veriyi al    | `./scripts/export-local-to-supabase.sh` → `database/export-from-local-data.sql` |
| Supabase’e yükle   | SQL Editor’da dosyayı yapıştırıp Run **veya** psql ile `-f database/export-from-local-data.sql` |
| Resimler           | Yerel uploads → Supabase Storage’a yükle → DB’deki URL’leri güncelle |

Böylece yerelde ne varsa (kullanıcılar, işletmeler, menüler, ekranlar, şablonlar, içerik kütüphanesi vb.) tek script ile export edilip Supabase’e yüklenebilir.
