-- Yayın kodu: Her TV için kısa, benzersiz kod (örn. 12345, 12344).
-- Android TV uygulamasında bu kod girilince ilgili TV açılır.

-- 1) broadcast_code sütununu ekle (5 haneli sayısal string, benzersiz)
ALTER TABLE screens ADD COLUMN IF NOT EXISTS broadcast_code VARCHAR(10) UNIQUE;

-- 2) Mevcut ekranlar için benzersiz 5 haneli kod ata (10000, 10001, 10002, ...)
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

-- 3) Hâlâ boş kalan varsa rastgele benzersiz kod ver
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
BEGIN
  FOR r IN SELECT id FROM screens WHERE broadcast_code IS NULL OR broadcast_code = '' LOOP
    FOR i IN 1..100 LOOP
      new_code := (10000 + FLOOR(RANDOM() * 90000)::int)::text;
      UPDATE screens SET broadcast_code = new_code WHERE id = r.id AND NOT EXISTS (SELECT 1 FROM screens s WHERE s.broadcast_code = new_code);
      EXIT WHEN (SELECT broadcast_code FROM screens WHERE id = r.id) IS NOT NULL;
    END LOOP;
  END LOOP;
END $$;

-- 4) Yeni ekranlar için NOT NULL (sadece tüm satırlar doluysa)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM screens WHERE broadcast_code IS NULL OR broadcast_code = '') THEN
    ALTER TABLE screens ALTER COLUMN broadcast_code SET NOT NULL;
  END IF;
END $$;

-- 5) İndeks (kod ile arama için)
CREATE UNIQUE INDEX IF NOT EXISTS idx_screens_broadcast_code ON screens(broadcast_code);
