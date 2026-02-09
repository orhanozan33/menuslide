-- ============================================================
-- Supabase: TV uygulaması için migration (tek seferde çalıştırın)
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run
-- ============================================================

-- 1) Yayın kodu: screens tablosuna broadcast_code
ALTER TABLE screens ADD COLUMN IF NOT EXISTS broadcast_code VARCHAR(10) UNIQUE;

WITH numbered AS (
  SELECT id, (10000 + (ROW_NUMBER() OVER (ORDER BY created_at, id))::int - 1)::text AS new_code
  FROM screens
  WHERE broadcast_code IS NULL OR broadcast_code = ''
),
deduped AS (
  SELECT n.id, n.new_code
  FROM numbered n
  WHERE NOT EXISTS (SELECT 1 FROM screens s WHERE s.broadcast_code = n.new_code AND s.id != n.id)
)
UPDATE screens s
SET broadcast_code = d.new_code
FROM deduped d
WHERE s.id = d.id;

DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  i INT;
BEGIN
  FOR r IN SELECT id FROM screens WHERE broadcast_code IS NULL OR broadcast_code = '' LOOP
    FOR i IN 1..100 LOOP
      new_code := (10000 + FLOOR(RANDOM() * 90000)::int)::text;
      UPDATE screens SET broadcast_code = new_code WHERE id = r.id AND NOT EXISTS (SELECT 1 FROM screens s WHERE s.broadcast_code = new_code);
      EXIT WHEN (SELECT broadcast_code FROM screens WHERE id = r.id) IS NOT NULL;
    END LOOP;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM screens WHERE broadcast_code IS NULL OR broadcast_code = '') THEN
    ALTER TABLE screens ALTER COLUMN broadcast_code SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_screens_broadcast_code ON screens(broadcast_code);

-- 2) TV uygulaması ayarları tablosu (super admin Ayarlar sayfası)
CREATE TABLE IF NOT EXISTS tv_app_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  api_base_url TEXT NOT NULL DEFAULT '',
  download_url TEXT NOT NULL DEFAULT '',
  watchdog_interval_minutes INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO tv_app_settings (id, api_base_url, download_url, watchdog_interval_minutes)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '', '/downloads/Menuslide.apk', 5)
ON CONFLICT (id) DO NOTHING;
