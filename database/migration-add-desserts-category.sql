-- Add Desserts category
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('desserts', 'Tatlılar', '🍰', 7)
ON CONFLICT (slug) DO NOTHING;
