-- Sistem TV kullanıcısı (tv_user): yayın/ekran limiti yok, abonelik kontrolü yok.
-- sistemtv@gmail.com bu role atanır.

-- 1) users.role CHECK'e 'tv_user' ekle
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('super_admin', 'admin', 'business_user', 'tv_user'));
  END IF;
END $$;

-- 2) sistemtv@gmail.com kullanıcısını tv_user yap ve business_id ata (ilk aktif işletme)
UPDATE users u
SET role = 'tv_user',
    business_id = (SELECT b.id FROM businesses b WHERE b.is_active = true ORDER BY b.created_at ASC, b.id ASC LIMIT 1),
    updated_at = NOW()
WHERE u.email = 'sistemtv@gmail.com';

COMMENT ON COLUMN users.role IS 'super_admin, admin, business_user, tv_user (tv_user = sistem TV, yayın sınırsız)';
