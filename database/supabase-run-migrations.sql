-- ============================================================
-- Supabase'de çalıştır: users tablosunda eksik sütunları ekle
-- (frame_type, ticker_text, ticker_style, preferred_locale, reference_number)
-- Sırayla SQL Editor'da çalıştır veya tek seferde bu dosyayı çalıştır.
-- ============================================================

-- 1) screens: frame_type, ticker_text, ticker_style
ALTER TABLE screens ADD COLUMN IF NOT EXISTS frame_type TEXT DEFAULT 'none';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ticker_text TEXT DEFAULT '';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ticker_style TEXT DEFAULT 'default';

-- 2) users: preferred_locale
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en' CHECK (preferred_locale IN ('en', 'tr', 'fr'));
UPDATE users SET preferred_locale = 'en' WHERE preferred_locale IS NULL;

-- 3) users: reference_number, referred_by_user_id (giriş hatası: column u.reference_number does not exist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reference_number ON users (reference_number) WHERE reference_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users (referred_by_user_id) WHERE referred_by_user_id IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS user_reference_seq;
CREATE SEQUENCE IF NOT EXISTS admin_reference_seq;

-- Mevcut business_user'lara 00001, 00002...
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

-- Mevcut admin/super_admin'lere ADM-00001, ADM-00002...
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

-- Sequence'leri güncelle
SELECT setval('user_reference_seq', COALESCE((SELECT MAX(CAST(reference_number AS INTEGER)) FROM users WHERE reference_number ~ '^\d+$'), 0) + 1);
SELECT setval('admin_reference_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)) FROM users WHERE reference_number ~ '^ADM-\d+$'), 0) + 1);
