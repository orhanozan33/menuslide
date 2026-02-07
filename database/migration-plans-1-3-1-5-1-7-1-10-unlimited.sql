-- Planlar: 1-3, 1-5, 1-7, 1-10 ekran + Sınırsız (15 TV üzerinden hesaplanır)
-- TV başı 12.99 USD, yıllık %10 indirim

-- 1-3 ekran: 3 * 12.99 → 38.99
UPDATE plans SET
  display_name = '1-3 Ekran',
  name = '1-3-screens',
  price_monthly = 38.99,
  price_yearly = 420.99,
  is_active = true
WHERE max_screens = 3;

-- 1-5 ekran: 5 * 12.99 → 64.99
UPDATE plans SET
  display_name = '1-5 Ekran',
  name = '1-5-screens',
  price_monthly = 64.99,
  price_yearly = 701.99,
  is_active = true
WHERE max_screens = 5;

-- 1-7 ekran: 7 * 12.99 → 90.99
UPDATE plans SET
  display_name = '1-7 Ekran',
  name = '1-7-screens',
  price_monthly = 90.99,
  price_yearly = 982.99,
  is_active = true
WHERE max_screens = 7;

-- 1-10 ekran: 10 * 12.99 → 129.99
UPDATE plans SET
  display_name = '1-10 Ekran',
  name = '1-10-screens',
  price_monthly = 129.99,
  price_yearly = 1403.99,
  is_active = true
WHERE max_screens = 10;

-- Sınırsız: 15 TV üzerinden → 194.99
UPDATE plans SET
  display_name = 'Sınırsız',
  name = 'enterprise',
  price_monthly = 194.99,
  price_yearly = 2105.99,
  is_active = true
WHERE max_screens = -1;

-- Eksik planları ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-3-screens', '1-3 Ekran', 3, 38.99, 420.99, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 3);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-5-screens', '1-5 Ekran', 5, 64.99, 701.99, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 5);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-7-screens', '1-7 Ekran', 7, 90.99, 982.99, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 7);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-10-screens', '1-10 Ekran', 10, 129.99, 1403.99, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 10);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'enterprise', 'Sınırsız', -1, 194.99, 2105.99, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = -1);

-- Diğer planları (1, 2, 4 ekran vb.) listede gösterme
UPDATE plans SET is_active = false WHERE max_screens IN (0, 1, 2, 4, 6, 8, 9);
