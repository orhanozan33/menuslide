-- Invalid credentials düzeltmesi: Supabase SQL Editor'de tek seferde çalıştır.
-- Giriş: orhanozan33@hotmail.com / 33333333

-- 1) password_hash sütunu yoksa ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- 2) Super admin ekle veya şifreyi güncelle (şifre: 33333333)
INSERT INTO users (email, password_hash, role, business_id)
VALUES (
  'orhanozan33@hotmail.com',
  '$2b$10$3cWu7mcoMdWtHyQnQoEelu/NAuwEpXgiBUtn0BEEJgxM./se.rjou',
  'super_admin',
  NULL
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'super_admin';
