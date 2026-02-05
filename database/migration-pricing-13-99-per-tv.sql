-- Plan fiyatları: TV başına 13.99
-- 3 ekran: 41.99, 5: 69.99, 7: 97.99, 10: 139.99, sınırsız (15 TV): 209.99
-- Yıllık: aylık * 12 * 0.9 (%10 indirim)

UPDATE plans SET price_monthly = 41.99,  price_yearly = ROUND(41.99 * 12 * 0.9, 2)  WHERE max_screens = 3;
UPDATE plans SET price_monthly = 69.99,  price_yearly = ROUND(69.99 * 12 * 0.9, 2)  WHERE max_screens = 5;
UPDATE plans SET price_monthly = 97.99,  price_yearly = ROUND(97.99 * 12 * 0.9, 2)  WHERE max_screens = 7;
UPDATE plans SET price_monthly = 139.99, price_yearly = ROUND(139.99 * 12 * 0.9, 2) WHERE max_screens = 10;
UPDATE plans SET price_monthly = 209.99, price_yearly = ROUND(209.99 * 12 * 0.9, 2) WHERE max_screens = -1;
