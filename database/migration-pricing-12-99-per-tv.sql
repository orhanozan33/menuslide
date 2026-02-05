-- Fiyatlandırma: Her TV (ekran) başı 12.99 USD (aylık). Yıllık %10 indirim.
-- 1 ekran: 12.99, 2: 25.98, 3: 38.97, 4: 51.96, 5: 64.95
-- Yıllık = aylık * 12 * 0.9 (%10 indirim)

-- Mevcut planları güncelle (max_screens'a göre)
UPDATE plans SET price_monthly = 12.99, price_yearly = ROUND(12.99 * 12 * 0.9, 2), display_name = '1 Screen', name = '1-screen' WHERE max_screens = 1;
UPDATE plans SET price_monthly = 25.98, price_yearly = ROUND(25.98 * 12 * 0.9, 2), display_name = '2 Screens', name = '2-screens' WHERE max_screens = 2;
UPDATE plans SET price_monthly = 38.97, price_yearly = ROUND(38.97 * 12 * 0.9, 2), display_name = '3 Screens', name = '3-screens' WHERE max_screens = 3;
UPDATE plans SET price_monthly = 51.96, price_yearly = ROUND(51.96 * 12 * 0.9, 2), display_name = '4 Screens', name = '4-screens' WHERE max_screens = 4;
UPDATE plans SET price_monthly = 64.95, price_yearly = ROUND(64.95 * 12 * 0.9, 2), display_name = '5 Screens', name = '5-screens' WHERE max_screens = 5;
UPDATE plans SET price_yearly = ROUND(price_monthly * 12 * 0.9, 2) WHERE max_screens = -1;

-- Eksik ekran planlarını ekle (2, 3, 4 yoksa)
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '2-screens', '2 Screens', 2, 25.98, ROUND(25.98 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 2);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '3-screens', '3 Screens', 3, 38.97, ROUND(38.97 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 3);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '4-screens', '4 Screens', 4, 51.96, ROUND(51.96 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 4);

-- 1 ekran planı yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-screen', '1 Screen', 1, 12.99, ROUND(12.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 1);

-- 5 ekran planı yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '5-screens', '5 Screens', 5, 64.95, ROUND(64.95 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 5);

-- Sınırsız plan yoksa ekle (örnek fiyat)
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'enterprise', 'Unlimited Screens', -1, 99.99, ROUND(99.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = -1);
