-- Fiyatlandırma: 5 paket (1-3, 1-5, 1-7, 1-10, Sınırsız). Eski planları kaldır.

-- Hiç abonelikte kullanılmayan eski planları sil
DELETE FROM plans
WHERE id NOT IN (SELECT plan_id FROM subscriptions)
  AND (max_screens NOT IN (3, 5, 7, 10, -1) OR name NOT IN ('starter-plan', 'pro', 'growth-plan', 'scale-plan', 'enterprise'));

-- Kalan eski planları (4 ekran dahil) pasif yap; sadece 5 paket aktif kalacak
UPDATE plans SET is_active = false WHERE max_screens NOT IN (3, 5, 7, 10, -1) OR name NOT IN ('starter-plan', 'pro', 'growth-plan', 'scale-plan', 'enterprise');

-- Fiyat: ekran başı 12.99 USD (aylık). Yıllık %10 indirim.
-- 1-3 Ekran: 3 × 12.99 = 38.97 → 38.99
UPDATE plans SET name = 'starter-plan', display_name = 'Starter Plan', price_monthly = 38.99, price_yearly = ROUND(38.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = 3;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'starter-plan', 'Starter Plan', 3, 38.99, ROUND(38.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 3);

-- 1-5 Ekran: 5 × 12.99 = 64.95 → 64.99
UPDATE plans SET name = 'pro', display_name = 'Pro Plan', price_monthly = 64.99, price_yearly = ROUND(64.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = 5;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'pro', 'Pro Plan', 5, 64.99, ROUND(64.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 5);

-- 1-7 Ekran: 7 × 12.99 = 90.93 → 90.99
UPDATE plans SET name = 'growth-plan', display_name = 'Growth Plan', price_monthly = 90.99, price_yearly = ROUND(90.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = 7;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'growth-plan', 'Growth Plan', 7, 90.99, ROUND(90.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 7);

-- 1-10 Ekran: 10 × 12.99 = 129.90 → 129.99
UPDATE plans SET name = 'scale-plan', display_name = 'Scale Plan', price_monthly = 129.99, price_yearly = ROUND(129.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = 10;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'scale-plan', 'Scale Plan', 10, 129.99, ROUND(129.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 10);

-- Sınırsız: 15 TV ekranı üzerinden fiyatlandırma — 15 × 12.99 = 194.85 → 194.99
UPDATE plans SET name = 'enterprise', display_name = 'Enterprise Plan', price_monthly = 194.99, price_yearly = ROUND(194.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = -1;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'enterprise', 'Enterprise Plan', -1, 194.99, ROUND(194.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = -1);

-- Eski planları tamamen kaldır: abonelikte kullanılmayan pasif planları sil
DELETE FROM plans
WHERE is_active = false
  AND id NOT IN (SELECT plan_id FROM subscriptions WHERE plan_id IS NOT NULL);
