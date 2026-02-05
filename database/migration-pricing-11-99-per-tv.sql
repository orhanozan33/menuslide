-- Fiyatlandırma: Her TV (ekran) başı 11.99 USD (aylık). Yıllık %10 indirim.
-- 1-3: 35.97, 1-5: 59.95, 1-7: 83.93, 1-10: 119.90, Sınırsız (15 TV): 179.85

UPDATE plans SET
  price_monthly = 35.97,
  price_yearly = ROUND(35.97 * 12 * 0.9, 2)
WHERE max_screens = 3;

UPDATE plans SET
  price_monthly = 59.95,
  price_yearly = ROUND(59.95 * 12 * 0.9, 2)
WHERE max_screens = 5;

UPDATE plans SET
  price_monthly = 83.93,
  price_yearly = ROUND(83.93 * 12 * 0.9, 2)
WHERE max_screens = 7;

UPDATE plans SET
  price_monthly = 119.90,
  price_yearly = ROUND(119.90 * 12 * 0.9, 2)
WHERE max_screens = 10;

UPDATE plans SET
  price_monthly = 179.85,
  price_yearly = ROUND(179.85 * 12 * 0.9, 2)
WHERE max_screens = -1;
