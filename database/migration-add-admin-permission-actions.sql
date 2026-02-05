-- Detaylı yetkiler: her sayfa için aksiyon bazlı yetki (resim ekleme, kategori açma vb.)
ALTER TABLE admin_permissions
  ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '{}';

COMMENT ON COLUMN admin_permissions.actions IS 'Sayfa bazlı detay yetkileri, örn. library: { "image_add": true, "category_create": true }';
