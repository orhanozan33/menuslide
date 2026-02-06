# Yerel veritabanındaki tüm veriyi Supabase'e taşıma

Supabase'de tablolar boşsa veya "birçok özellik almamış" görünüyorsa, yerel PostgreSQL'deki **tüm veriyi** (kullanıcılar, işletmeler, menüler, şablonlar, ekranlar, içerik kütüphanesi, kayıt talepleri vb.) tek komutla Supabase'e aktarabilirsiniz.

## Gereksinimler

- Yerel PostgreSQL çalışıyor ve `tvproje` veritabanında verileriniz var
- `backend/.env` içinde yerel DB bilgileri: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Supabase proje şifresi: Dashboard → **Settings** → **Database** → **Database password**

## Tek komut (tüm veriyi taşı)

Terminalde proje kökündeyken:

```bash
export SUPABASE_DB_PASSWORD='Supabase_veritabani_sifreniz'
./scripts/push-to-supabase.sh
```

Bu script:

1. Yerel PostgreSQL'den tüm uygulama tablolarını export eder
2. Supabase'de eksik sütunları ekler (varsa)
3. Supabase'deki ilgili tabloları temizler
4. Export'u Supabase'e import eder
5. Gerekirse home_channels / upload path'lerini günceller

## Taşınan tablolar

- businesses, users, plans, languages  
- menus, menu_items, menu_item_translations  
- screens, screen_menu, menu_schedules  
- templates, template_blocks, template_block_contents  
- screen_blocks, screen_block_contents  
- content_library, content_library_categories  
- subscriptions, payments  
- contact_info, home_channels, screen_template_rotations  
- display_viewers, payment_failures  
- admin_permissions, admin_activity_log, screen_edit_history  
- registration_requests  

## Sadece export almak (Supabase'e kendiniz yükleyecekseniz)

```bash
./scripts/export-local-to-supabase.sh
```

Çıktı: `database/export-from-local-data.sql`  
Bu dosyayı Supabase Dashboard → **SQL Editor** içinde çalıştırabilirsiniz (dosya büyükse psql ile bağlanıp import edin).

## Sorun giderme

- **"Veritabanına bağlanılamadı"**: PostgreSQL'in çalıştığından ve `backend/.env` içindeki şifrenin doğru olduğundan emin olun.
- **"SUPABASE_DB_PASSWORD gerekli"**: `export SUPABASE_DB_PASSWORD='...'` ile şifreyi vermeniz gerekir.
- **pg_dump sürüm uyumsuzluğu**: Script, Node ile export denemesi yapabilir; `backend/scripts/export-local-data.cjs` varsa kullanılır.
