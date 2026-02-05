-- Admin referans numarası: admin ve super_admin kullanıcılara ADM-00001, ADM-00002... atanır.
-- business_user referansları (00001, 00002) ile karışmaz.

CREATE SEQUENCE IF NOT EXISTS admin_reference_seq;

-- Mevcut max ADM numarası (varsa)
WITH max_adm AS (
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)), 0)::int AS m
  FROM users
  WHERE reference_number ~ '^ADM-\d+$'
),
-- Numarası olmayan admin/super_admin'leri created_at sırasına göre listele
ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users
  WHERE role IN ('admin', 'super_admin')
    AND (reference_number IS NULL OR reference_number = '' OR reference_number !~ '^ADM-\d+$')
)
UPDATE users u
SET reference_number = 'ADM-' || LPAD((m.m + o.rn)::text, 5, '0')
FROM ordered o, max_adm m
WHERE u.id = o.id;

-- Sequence'i mevcut max + 1 yap (yeni admin kayıtları doğru numarayı alsın)
SELECT setval(
  'admin_reference_seq',
  COALESCE((
    SELECT MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER))
    FROM users
    WHERE reference_number ~ '^ADM-\d+$'
  ), 0) + 1
);
