-- Yöresel Tek Menü kategorisini admin kütüphanesine ekle
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('regional', 'Yöresel Tek Menü', '🍽️', 7)
ON CONFLICT (slug) DO NOTHING;
