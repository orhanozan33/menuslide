-- Supabase: Boş kalan tabloları doldur (export-from-local-data.sql sonrası çalıştırın)
-- Tablolar: home_channels, menu_item_translations, menu_schedules, payments, screen_block_contents, qr_menus
-- Not: payment_failures tablosu boş kalır; başarısız ödemelerde Stripe/webhook ile dolar.

-- ========== home_channels (ana sayfa kanal listesi) ==========
INSERT INTO home_channels (slug, title, description, link, display_order)
SELECT v.slug, v.title, v.description, v.link, v.display_order
FROM (VALUES
  ('metro-tv1', 'Ana Salon', 'Ana salon ekranı', '/display/metro-tv1', 0),
  ('metro-tv2', 'Bar', 'Bar ekranı', '/display/metro-tv2', 1),
  ('metro-pizza-tv3', 'Teras', 'Teras ekranı', '/display/metro-pizza-tv3', 2)
) AS v(slug, title, description, link, display_order)
WHERE NOT EXISTS (SELECT 1 FROM home_channels h WHERE h.slug = v.slug);

-- ========== menu_item_translations (her menu_item için en az 'en') ==========
INSERT INTO menu_item_translations (id, menu_item_id, language_code, name, description, created_at, updated_at)
SELECT gen_random_uuid(), mi.id, 'en', mi.name, mi.description, NOW(), NOW()
FROM menu_items mi
WHERE EXISTS (SELECT 1 FROM languages l WHERE l.code = 'en')
  AND NOT EXISTS (SELECT 1 FROM menu_item_translations t WHERE t.menu_item_id = mi.id AND t.language_code = 'en');

-- ========== menu_schedules (ekran–menü eşlemesi; get_active_menu_for_screen için) ==========
INSERT INTO menu_schedules (id, screen_id, menu_id, start_time, end_time, day_of_week, is_active, created_at, updated_at)
SELECT gen_random_uuid(), v.screen_id, v.menu_id, '00:00'::time, '23:59'::time, NULL, true, NOW(), NOW()
FROM (VALUES
  ('83e99668-45b0-4fdb-b448-5c14dbc2e330'::uuid, 'bb9e5908-b505-4dac-9efc-c20f60315a4f'::uuid),
  ('9a55aa5d-6cc4-43d1-890f-f80049b6ee05'::uuid, 'bb9e5908-b505-4dac-9efc-c20f60315a4f'::uuid),
  ('4ca8a997-0b1b-4334-9610-12f84f49ae5c'::uuid, 'bb9e5908-b505-4dac-9efc-c20f60315a4f'::uuid)
) AS v(screen_id, menu_id)
WHERE NOT EXISTS (SELECT 1 FROM menu_schedules m WHERE m.screen_id = v.screen_id);

-- ========== payments (mevcut abonelikler için örnek ödeme) ==========
INSERT INTO payments (id, subscription_id, amount, currency, status, payment_date, created_at) VALUES
  (gen_random_uuid(), '3caa7ee4-2424-46b4-8f26-ee118379f990'::uuid, 25.98, 'usd', 'succeeded', NOW() - INTERVAL '10 days', NOW()),
  (gen_random_uuid(), 'dd1dae52-2108-4fc0-8501-9c11cb62c727'::uuid, 14.99, 'usd', 'succeeded', NOW() - INTERVAL '5 days', NOW())
ON CONFLICT DO NOTHING;

-- ========== screen_block_contents (her screen_block için bir product_list) ==========
INSERT INTO screen_block_contents (id, screen_block_id, content_type, menu_id, display_order, is_active, created_at, updated_at)
SELECT gen_random_uuid(), v.screen_block_id, 'product_list', 'bb9e5908-b505-4dac-9efc-c20f60315a4f'::uuid, 0, true, NOW(), NOW()
FROM (VALUES
  ('3cc00fb8-a616-4257-af24-7ad6db867821'::uuid),
  ('edc57341-7c8a-4093-9eb1-98ac0b8fe3b0'::uuid),
  ('178a31b8-083e-4355-a763-6674f61bc707'::uuid),
  ('035b7748-f81e-411a-a488-6ef48910621b'::uuid),
  ('00205f0d-ff0c-4f58-ab0a-1b7236bf45a9'::uuid),
  ('4539abfb-afdd-45d0-b353-9d6e4603da10'::uuid),
  ('cc082973-8519-4ae3-af67-ae66241fb386'::uuid),
  ('f4309276-afe5-4b77-8afc-0d596fb26352'::uuid),
  ('8fef356f-9a2f-4c6e-b355-685148810a8e'::uuid)
) AS v(screen_block_id)
WHERE NOT EXISTS (SELECT 1 FROM screen_block_contents s WHERE s.screen_block_id = v.screen_block_id);

-- ========== qr_menus (her işletme için bir QR menü; sayfa açıldığında hazır olsun) ==========
INSERT INTO qr_menus (id, business_id, screen_id, qr_code_url, qr_code_data, token, is_active, created_at, updated_at)
SELECT gen_random_uuid(), b.id, NULL, '', '', generate_qr_token(), true, NOW(), NOW()
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM qr_menus q WHERE q.business_id = b.id AND q.screen_id IS NULL);
