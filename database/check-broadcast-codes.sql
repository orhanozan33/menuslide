-- ============================================================
-- Supabase: broadcast_code var mı, dolu mu kontrol
-- Supabase Dashboard → SQL Editor → yapıştır → Run
-- ============================================================

-- 1) Sütun var mı? (Hata alırsanız "column does not exist" = migration çalıştırılmamış)
SELECT id, name, broadcast_code, is_active, public_slug
FROM screens
ORDER BY created_at
LIMIT 20;

-- 2) Kaç ekranda kod var / yok?
SELECT
  COUNT(*) FILTER (WHERE broadcast_code IS NOT NULL AND broadcast_code != '') AS with_code,
  COUNT(*) FILTER (WHERE broadcast_code IS NULL OR broadcast_code = '') AS without_code
FROM screens;
