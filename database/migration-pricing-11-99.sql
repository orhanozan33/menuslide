-- Fiyat güncellemesi: 1 ekran = 11.99$, 2-5 ekran buna göre, yıllıkta %10 indirim, artı vergi (frontend'de)
-- 1 screen: 11.99, 2: 23.99, 3: 35.99, 4: 47.99, 5: 59.99
-- Yıllık = aylık * 12 * 0.9 (%10 indirim)

-- Mevcut planları güncelle
UPDATE plans SET price_monthly = 11.99, price_yearly = ROUND(11.99 * 12 * 0.9, 2), display_name = '1 Screen' WHERE max_screens = 1;
UPDATE plans SET price_monthly = 23.99, price_yearly = ROUND(23.99 * 12 * 0.9, 2), display_name = '2 Screens' WHERE max_screens = 2;
UPDATE plans SET price_monthly = 35.99, price_yearly = ROUND(35.99 * 12 * 0.9, 2), display_name = '3 Screens' WHERE max_screens = 3;
UPDATE plans SET price_monthly = 47.99, price_yearly = ROUND(47.99 * 12 * 0.9, 2), display_name = '4 Screens' WHERE max_screens = 4;
UPDATE plans SET price_monthly = 59.99, price_yearly = ROUND(59.99 * 12 * 0.9, 2), display_name = '5 Screens' WHERE max_screens = 5;
UPDATE plans SET price_yearly = ROUND(price_monthly * 12 * 0.9, 2) WHERE max_screens = -1;

-- 2, 3, 4 ekran planları yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '2-screens', '2 Screens', 2, 23.99, ROUND(23.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 2);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '3-screens', '3 Screens', 3, 35.99, ROUND(35.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 3);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '4-screens', '4 Screens', 4, 47.99, ROUND(47.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 4);
