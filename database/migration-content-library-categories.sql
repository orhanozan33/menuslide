-- Migration: content_library_categories - Admin tarafından düzenlenebilir kategoriler

CREATE TABLE IF NOT EXISTS content_library_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(20) DEFAULT '📦',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_library_categories_order ON content_library_categories(display_order);

-- Mevcut kategorileri ekle
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('food', 'Yiyecekler', '🍕', 0),
  ('pasta', 'Makarnalar', '🍝', 1),
  ('drinks', 'İçecekler', '🍹', 2),
  ('icons', 'İkonlar', '🎨', 3),
  ('badges', 'Rozetler', '🏷️', 4),
  ('backgrounds', 'Arka Planlar', '🖼️', 5),
  ('text', 'Metin Şablonları', '📝', 6)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE content_library_categories IS 'Admin tarafından düzenlenebilir içerik kütüphanesi kategori tanımları';
