-- 1) RPC for frontend: yeni admin oluşturulurken referans numarası almak.
-- 2) Mevcut referansı olmayan admin/super_admin'lere ADM-00001, ADM-00002... ata (backfill).
CREATE SEQUENCE IF NOT EXISTS admin_reference_seq;

CREATE OR REPLACE FUNCTION get_next_admin_reference()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'ADM-' || LPAD(nextval('admin_reference_seq')::text, 5, '0');
$$;

COMMENT ON FUNCTION get_next_admin_reference() IS 'Returns next ADM-00001 style reference for admin/super_admin users.';

-- Mevcut numarası olmayan admin/super_admin'lere sırayla referans ata
WITH max_adm AS (
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)), 0)::int AS m
  FROM users
  WHERE reference_number ~ '^ADM-\d+$'
),
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

-- Sequence'i güncelle (yeni admin kayıtları doğru numarayı alsın)
SELECT setval(
  'admin_reference_seq',
  COALESCE((
    SELECT MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER))
    FROM users
    WHERE reference_number ~ '^ADM-\d+$'
  ), 0) + 1
);
