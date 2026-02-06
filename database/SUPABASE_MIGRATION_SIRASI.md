# Supabase Migration — Sıra ile Adım Adım Rehber

> **Tüm kurulum (Supabase + Vercel + yerel) adım adım:** [docs/ADIM_ADIM_KURULUM.md](../docs/ADIM_ADIM_KURULUM.md)

Supabase SQL Editor'de **bu sırayla** çalıştırın. Her adım tamamlandıktan sonra bir sonrakine geçin.

---

## ADIM 1: Ana şema (temel tablolar)

**Dosya:** `schema-local.sql`

Supabase SQL Editor'ü açın → New query → `database/schema-local.sql` dosyasının **tüm içeriğini** yapıştırın → Run.

> Bu adım: businesses, users, menus, menu_items, screens, screen_menu, menu_schedules, languages, menu_item_translations, plans, subscriptions, payments tablolarını ve temel fonksiyonları oluşturur.

---

## ADIM 2: Şablon sistemi şeması

**Dosya:** `templates-schema.sql`

`database/templates-schema.sql` dosyasının tamamını çalıştırın.

> templates, template_blocks, screen_blocks tabloları oluşturulur.

---

## ADIM 3: Şablon blok içerikleri

**Dosya:** `template-block-contents-schema.sql`

`database/template-block-contents-schema.sql` dosyasının tamamını çalıştırın.

> template_block_contents tablosu oluşturulur (screen_block_contents farklı bir tablo; bu migration ile gelir).

---

## ADIM 4: Template editor güncellemeleri

**Dosya:** `template-editor-schema.sql`

`database/template-editor-schema.sql` dosyasının tamamını çalıştırın.

> screen_blocks tablosuna drag & drop alanları eklenir.

---

## ADIM 5: Text content güncellemeleri

**Dosya:** `text-content-schema.sql`

`database/text-content-schema.sql` dosyasının tamamını çalıştırın.

> screen_block_contents tablosuna metin pozisyonlama alanları eklenir.

---

## ADIM 6: İçerik kütüphanesi

**Dosya:** `migration-create-content-library.sql`

`database/migration-create-content-library.sql` dosyasının tamamını çalıştırın.

---

## ADIM 7: Migration dosyaları (alfabetik sıra)

Aşağıdaki `migration-*.sql` dosyalarını **sırayla** çalıştırın:

| # | Dosya |
|---|-------|
| 1 | migration-add-7-8-templates.sql |
| 2 | migration-add-admin-activity-log.sql |
| 3 | migration-add-admin-permission-actions.sql |
| 4 | migration-add-admin-reference-number.sql |
| 5 | migration-add-admin-role-and-permissions.sql |
| 6 | migration-add-alcoholic-drinks-glasses.sql |
| 7 | migration-add-canvas-design-to-templates.sql |
| 8 | migration-add-desserts-category.sql |
| 9 | migration-add-display-frame-ticker.sql |
| 10 | migration-add-display-scale-indexes.sql |
| 11 | migration-add-drink-content-type.sql |
| 12 | migration-add-invoice-number.sql |
| 13 | migration-add-preferred-locale.sql |
| 14 | migration-add-public-slug.sql |
| 15 | migration-add-qr-background-to-businesses.sql |
| 16 | migration-add-reference-number.sql |
| 17 | migration-add-regional-category.sql |
| 18 | migration-add-regional-menu-content-type.sql |
| 19 | migration-add-rotation-transition-effect.sql |
| 20 | migration-add-template-rotation.sql |
| 21 | migration-add-template-transition-effect.sql |
| 22 | migration-add-ticker-style.sql |
| 23 | migration-add-uploaded-by-to-content-library.sql |
| 24 | migration-add-video-content-type.sql |
| 25 | migration-add-video-to-screen-block-contents.sql |
| 26 | migration-add-video-type-to-content-library.sql |
| 27 | migration-clean-content-library-duplicates.sql |
| 28 | migration-clean-content-library-duplicates-v2.sql |
| 29 | migration-content-library-categories.sql |
| 30 | migration-content-library-english-canadian-drinks.sql |
| 31 | migration-display-viewers.sql |
| 32 | migration-display-viewers-first-seen.sql |
| 33 | migration-enrich-content-library-images.sql |
| 34 | migration-enrich-food-soups-fish-doner-breakfast.sql |
| 35 | migration-fix-2-block-template-height.sql |
| 36 | migration-fix-5-3-7-block-special-layout.sql |
| 37 | migration-fix-all-system-template-blocks-layout.sql |
| 38 | migration-fix-orhan-template-name.sql |
| 39 | migration-import-all-categories.sql |
| 40 | migration-import-content-library.sql |
| 41 | migration-increase-block-count-limit.sql |
| 42 | migration-invoice-auto-number-trigger.sql |
| 43 | migration-menu-pages.sql |
| 44 | migration-move-pasta-to-pasta-category.sql |
| 45 | migration-plan-names.sql |
| 46 | migration-plans-1-3-1-5-1-7-1-10-unlimited.sql |
| 47 | migration-prices-end-99.sql |
| 48 | migration-pricing-11-99.sql |
| 49 | migration-pricing-11-99-per-tv.sql |
| 50 | migration-pricing-12-99-per-tv.sql |
| 51 | migration-pricing-13-99-per-tv.sql |
| 52 | migration-pricing-14-99.sql |
| 53 | migration-pricing-packages.sql |
| 54 | migration-remove-regional-tek-menu-category.sql |
| 55 | migration-stripe-price-1screen.sql |

---

## ADIM 8: migrations klasörü

`database/migrations/` içindeki dosyaları sırayla çalıştırın:

| # | Dosya |
|---|-------|
| 1 | migrations/add_advanced_features.sql |
| 2 | migrations/add_billing_interval.sql |
| 3 | migrations/add_display_scale_indexes.sql |
| 4 | migrations/add_payment_failures.sql |
| 5 | migrations/add_tv_ui_customization.sql |

---

## ADIM 9: İletişim bilgisi ve ana sayfa kanalları

**Dosya:** `migration-contact-info-home-channels.sql`

Aşağıdaki SQL kodunu çalıştırın:

```sql
-- contact_info: tek satır (singleton) - ana sayfa iletişim bilgileri
CREATE TABLE IF NOT EXISTS contact_info (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO contact_info (id, email, phone, address, whatsapp)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- home_channels: ana sayfa kanal listesi (sıra önemli)
CREATE TABLE IF NOT EXISTS home_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL DEFAULT 'channel',
  title TEXT NOT NULL DEFAULT 'Channel',
  description TEXT,
  link TEXT,
  thumbnail TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_channels_order ON home_channels(display_order);
```

---

## Özet sıra

1. schema-local.sql  
2. templates-schema.sql  
3. template-block-contents-schema.sql  
4. template-editor-schema.sql  
5. text-content-schema.sql  
6. migration-create-content-library.sql  
7. migration-add-* ve migration-* dosyaları (yukarıdaki tablodaki sıra)  
8. migrations/*.sql dosyaları  
9. migration-contact-info-home-channels.sql  

---

## Notlar

- Hata alırsanız genelde "already exists" veya "duplicate" olur; bu durumda ilgili migration zaten uygulanmış demektir, sonrakine geçebilirsiniz.
- `template-library-schema.sql` ve `enterprise-features-schema.sql` ihtiyaca göre ayrıca çalıştırılabilir; temel akışta zorunlu değildir.
- Supabase SQL Editor bazen uzun script'leri parça parça çalıştırmanızı isteyebilir; gerekirse script'leri bölerek tekrar deneyin.
