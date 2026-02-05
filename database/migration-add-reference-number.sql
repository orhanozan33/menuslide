-- Referans numarası: her kullanıcıya 00001, 00002... atanır; referans ile gelenler referred_by_user_id ile işaretlenir.
-- Eski kayıtlar korunur, mevcut business_user'lara created_at sırasına göre numara verilir.

-- Sütunlar
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reference_number ON users (reference_number) WHERE reference_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users (referred_by_user_id) WHERE referred_by_user_id IS NOT NULL;

-- Sıra numarası için sequence (yeni kayıtlar için)
CREATE SEQUENCE IF NOT EXISTS user_reference_seq;

-- Mevcut business_user'lara created_at sırasıyla 00001, 00002... ata (henüz atanmamış olanlara; mevcut numaraları ezmez)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users
  WHERE role = 'business_user' AND (reference_number IS NULL OR reference_number = '')
),
max_ref AS (
  SELECT COALESCE(MAX(CAST(reference_number AS INTEGER)), 0)::int AS m FROM users WHERE reference_number ~ '^\d+$'
)
UPDATE users u
SET reference_number = LPAD((m.m + o.rn)::text, 5, '0')
FROM ordered o, max_ref m
WHERE u.id = o.id;

-- Sequence'i mevcut max + 1 yap (yeni kayıtlar doğru numarayı alsın)
SELECT setval(
  'user_reference_seq',
  COALESCE((SELECT MAX(CAST(reference_number AS INTEGER)) FROM users WHERE reference_number ~ '^\d+$'), 0) + 1
);
