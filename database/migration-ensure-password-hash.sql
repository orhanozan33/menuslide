-- Backend login (password_hash) kullanıyorsa users tablosunda bu sütun olmalı.
-- Supabase SQL Editor'de bir kez çalıştırın; sütun yoksa eklenir.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;
