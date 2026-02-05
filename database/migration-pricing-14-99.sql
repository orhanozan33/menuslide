-- Fiyat güncellemesi: 1 ekran = 14.99$
-- 2-5 ekran: ekran başı 14.99, yıllıkta %15 indirim
-- Yıllık = aylık * 12 * 0.85 (%15 indirim)

-- Mevcut planları güncelle
UPDATE plans SET price_monthly = 14.99, price_yearly = ROUND(14.99 * 12 * 0.85, 2), display_name = '1 Screen' WHERE max_screens = 1;
UPDATE plans SET price_monthly = 29.98, price_yearly = ROUND(29.98 * 12 * 0.85, 2), display_name = '2 Screens' WHERE max_screens = 2;
UPDATE plans SET price_monthly = 44.97, price_yearly = ROUND(44.97 * 12 * 0.85, 2), display_name = '3 Screens' WHERE max_screens = 3;
UPDATE plans SET price_monthly = 59.96, price_yearly = ROUND(59.96 * 12 * 0.85, 2), display_name = '4 Screens' WHERE max_screens = 4;
UPDATE plans SET price_monthly = 74.95, price_yearly = ROUND(74.95 * 12 * 0.85, 2), display_name = '5 Screens' WHERE max_screens = 5;
UPDATE plans SET price_yearly = ROUND(price_monthly * 12 * 0.85, 2) WHERE max_screens = -1;

-- 2, 3, 4 ekran planları yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '2-screens', '2 Screens', 2, 29.98, ROUND(29.98 * 12 * 0.85, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 2);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '3-screens', '3 Screens', 3, 44.97, ROUND(44.97 * 12 * 0.85, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 3);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '4-screens', '4 Screens', 4, 59.96, ROUND(59.96 * 12 * 0.85, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 4);
