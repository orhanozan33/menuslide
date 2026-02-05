-- Admin rolü ve yetki tablosu: Super admin, admin kullanıcı oluşturabilsin; admin sayfalara yetki ile erişsin

-- 1) users.role CHECK'e 'admin' ekle (varsa güncelle)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('super_admin', 'admin', 'business_user'));
  END IF;
END $$;

-- 2) Admin yetkileri: hangi sayfada ne yetkisi var (view / edit / full)
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR(80) NOT NULL,
  permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'full')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_page_key ON admin_permissions(page_key);

COMMENT ON TABLE admin_permissions IS 'Admin kullanıcıların sayfa bazlı yetkileri (view=görüntüle, edit=düzenle, full=tam)';
