# Sayfada Eksik Veri (Kütüphane, Şablonlar, Menüler, Editör)

Sayfada içerik kütüphanesi, hazır şablonlar, tasarlanmış şablonlar, menüler veya editör verisi görünmüyorsa aşağıdakileri kontrol edin.

---

## 1. Backend canlıda Supabase'e bağlı mı?

Canlı (production) backend ortamında **DATABASE_URL** mutlaka **Supabase** bağlantı dizesi olmalı.

- Render / Vercel / vb. ortam değişkenlerinde: `DATABASE_URL=postgresql://postgres:XXX@db.XXXX.supabase.co:5432/postgres`
- Yerel URL (`localhost`) veya boş ise uygulama veriyi Supabase'den okuyamaz; sayfa boş kalır.

---

## 2. Import doğru ve tam çalıştı mı?

`./scripts/import-to-supabase.sh` çalıştırdıktan sonra terminalde **Supabase satır sayıları** bölümü çıkar. Örnek:

```
Supabase satır sayıları (kontrol):
 businesses          | 3
 users               | 5
 menus               | 3
 menu_items          | 35
 templates            | 40
 template_blocks      | 178
 screens              | 3
 screen_blocks        | 9
 content_library      | 265
 content_library_categories | 7
 screen_template_rotations | 6
 admin_permissions    | 14
```

- **content_library**, **templates**, **menus**, **screens** için **0** görüyorsanız: Bu tablolar için INSERT'ler hata vermiş demektir (genelde eksik sütun veya tablo).
- **Çözüm:** Önce `database/supabase-ensure-columns-before-import.sql` dosyasının güncel olduğundan emin olun (içinde `content_library` tablosu, `uploaded_by`, `source`, `transition_effect`, `actions` vb. var). Sonra import'u tekrarlayın:
  ```bash
  ./scripts/import-to-supabase.sh
  ```

---

## 3. Supabase Table Editor ile kontrol

Supabase Dashboard → **Table Editor** → şu tablolara bakın:

- `content_library` — İçerik kütüphanesi (resim/video/ikon)
- `content_library_categories` — Kütüphane kategorileri
- `templates` — Hazır / tasarlanmış şablonlar
- `template_blocks` — Şablon blokları
- `menus` — Menüler
- `menu_items` — Menü ürünleri
- `screens` — Ekranlar
- `screen_template_rotations` — Yayındaki şablon rotasyonları

Bu tablolarda satır **var** ama sayfada **yok** ise sorun büyük ihtimalle backend'in canlıda **yanlış veritabanına** (ör. yerel DB) bağlanmasıdır. Ortam değişkenlerinde **DATABASE_URL** = Supabase connection string olmalı.

---

## 4. Import'u sıfırdan tekrarlamak

Tüm veriyi silip yerel export'u tekrar yüklemek isterseniz:

1. Supabase SQL Editor'da (dikkat: tüm uygulama verisini siler):
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
2. Yerelde tekrar export alın: `./scripts/export-local-to-supabase.sh`
3. Import: `./scripts/import-to-supabase.sh`
4. Çıktıdaki satır sayılarında 0 olan tablo kalmadığından emin olun.

---

## Özet

| Sorun | Kontrol / Çözüm |
|--------|------------------|
| Sayfada kütüphane / şablon / menü yok | Backend canlıda DATABASE_URL = Supabase mi? |
| Import sonrası content_library 0 | ensure-columns güncel mi? Import'u tekrarla. |
| Tabloda veri var, sayfada yok | Backend yanlış DB'ye bağlı; DATABASE_URL'i düzelt. |

Detaylı taşıma rehberi: **`docs/YERELDEN_CANLIYA_TUM_VERI.md`**
