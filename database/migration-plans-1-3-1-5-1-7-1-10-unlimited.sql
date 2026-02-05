-- Planlar: 1-3, 1-5, 1-7, 1-10 ekran + Sınırsız (15 TV üzerinden hesaplanır)
-- TV başı 12.99 USD, yıllık %10 indirim

-- 1-3 ekran: 3 * 12.99 = 38.97
UPDATE plans SET
  display_name = '1-3 Screens',
  name = '1-3-screens',
  price_monthly = 38.97,
  price_yearly = ROUND(38.97 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = 3;

-- 1-5 ekran: 5 * 12.99 = 64.95
UPDATE plans SET
  display_name = '1-5 Screens',
  name = '1-5-screens',
  price_monthly = 64.95,
  price_yearly = ROUND(64.95 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = 5;

-- 1-7 ekran: 7 * 12.99 = 90.93
UPDATE plans SET
  display_name = '1-7 Screens',
  name = '1-7-screens',
  price_monthly = 90.93,
  price_yearly = ROUND(90.93 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = 7;

-- 1-10 ekran: 10 * 12.99 = 129.90
UPDATE plans SET
  display_name = '1-10 Screens',
  name = '1-10-screens',
  price_monthly = 129.90,
  price_yearly = ROUND(129.90 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = 10;

-- Sınırsız: 15 TV üzerinden = 15 * 12.99 = 194.85
UPDATE plans SET
  display_name = 'Unlimited (15 TVs)',
  name = 'enterprise',
  price_monthly = 194.85,
  price_yearly = ROUND(194.85 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = -1;

-- 1-7 planı yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-7-screens', '1-7 Screens', 7, 90.93, ROUND(90.93 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 7);

-- 1-10 planı yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-10-screens', '1-10 Screens', 10, 129.90, ROUND(129.90 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 10);

-- Diğer planları (1, 2, 4 ekran vb.) listede gösterme
UPDATE plans SET is_active = false WHERE max_screens IN (0, 1, 2, 4, 6, 8, 9);
