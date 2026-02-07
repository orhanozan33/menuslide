-- Fiyatlar: 12.99 CAD / ekran. 1 ekran planı kaldırıldı (bizde yok).
-- Planlar: Starter (3), Pro (5), Growth (7), Scale (10), Enterprise (sınırsız)

-- 1 ekran planını pasif yap
UPDATE plans SET is_active = false WHERE max_screens = 1;

-- Fiyatlar: ekran başı 12.99 CAD, yıllık %10 indirim
-- 3 ekran: 3 × 12.99 = 38.97 → 38.99
-- 5 ekran: 5 × 12.99 = 64.95 → 64.99
-- 7 ekran: 7 × 12.99 = 90.93 → 90.99
-- 10 ekran: 10 × 12.99 = 129.90 → 129.99
-- Sınırsız: 15 × 12.99 = 194.85 → 194.99
UPDATE plans SET price_monthly = 38.99, price_yearly = ROUND(38.99 * 12 * 0.9, 2) WHERE max_screens = 3;
UPDATE plans SET price_monthly = 64.99, price_yearly = ROUND(64.99 * 12 * 0.9, 2) WHERE max_screens = 5;
UPDATE plans SET price_monthly = 90.99, price_yearly = ROUND(90.99 * 12 * 0.9, 2) WHERE max_screens = 7;
UPDATE plans SET price_monthly = 129.99, price_yearly = ROUND(129.99 * 12 * 0.9, 2) WHERE max_screens = 10;
UPDATE plans SET price_monthly = 194.99, price_yearly = ROUND(194.99 * 12 * 0.9, 2) WHERE max_screens = -1;
