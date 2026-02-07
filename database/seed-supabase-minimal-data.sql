-- ============================================================
-- Supabase: Super admin giriş yaptı ama "tüm veriler yok" için
-- Bu dosyayı SQL Editor'da çalıştır: dil, plan, 1 işletme, 1 menü, 1 ekran ekler.
-- ============================================================

-- 1) Diller (yoksa ekle)
INSERT INTO languages (code, name, is_default, is_active) VALUES
    ('en', 'English', true, true),
    ('tr', 'Turkish', false, true),
    ('fr', 'French', false, true),
    ('es', 'Spanish', false, true),
    ('de', 'German', false, true),
    ('it', 'Italian', false, true),
    ('pt', 'Portuguese', false, true)
ON CONFLICT (code) DO NOTHING;

-- 2) Planlar (1 ekran = 12.99$, yıllık %10 indirim, fiyat sonu .99): 1-3, 1-5, 1-7, 1-10, Sınırsız
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active) VALUES
    ('1-3-screens', '1-3 Ekran', 3, 38.99, 420.99, true),
    ('1-5-screens', '1-5 Ekran', 5, 64.99, 701.99, true),
    ('1-7-screens', '1-7 Ekran', 7, 90.99, 982.99, true),
    ('1-10-screens', '1-10 Ekran', 10, 129.99, 1403.99, true),
    ('enterprise', 'Sınırsız', -1, 194.99, 2105.99, true)
ON CONFLICT (name) DO NOTHING;

-- 3) Demo işletme (zaten varsa atla)
INSERT INTO businesses (id, name, slug, is_active, created_at, updated_at)
VALUES (
    'a0000001-0001-0001-0001-000000000001'::uuid,
    'Demo İşletme',
    'demo-isletme',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4) Demo menü (business_id = yukarıdaki işletme)
INSERT INTO menus (id, business_id, name, description, slide_duration, is_active)
SELECT
    'b0000001-0001-0001-0001-000000000001'::uuid,
    id,
    'Demo Menü',
    'Başlangıç menüsü',
    5,
    true
FROM businesses
WHERE slug = 'demo-isletme' OR id = 'a0000001-0001-0001-0001-000000000001'::uuid
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 5) Demo ekran (TV) – aynı işletmeye bağlı, public_token ve public_slug ile
INSERT INTO screens (
    id,
    business_id,
    name,
    public_token,
    public_slug,
    is_active,
    animation_type,
    animation_duration
)
SELECT
    'c0000001-0001-0001-0001-000000000001'::uuid,
    b.id,
    'TV 1',
    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    'demo-tv1',
    true,
    'fade',
    500
FROM businesses b
WHERE b.slug = 'demo-isletme' OR b.id = 'a0000001-0001-0001-0001-000000000001'::uuid
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Ekranı menüye bağla (screen_menu)
INSERT INTO screen_menu (screen_id, menu_id, display_order)
SELECT s.id, m.id, 0
FROM screens s
JOIN businesses b ON s.business_id = b.id
JOIN menus m ON m.business_id = b.id
WHERE (b.slug = 'demo-isletme' OR b.id = 'a0000001-0001-0001-0001-000000000001'::uuid)
  AND (s.public_slug = 'demo-tv1' OR s.id = 'c0000001-0001-0001-0001-000000000001'::uuid)
  AND m.name = 'Demo Menü'
LIMIT 1
ON CONFLICT (screen_id, menu_id) DO NOTHING;
