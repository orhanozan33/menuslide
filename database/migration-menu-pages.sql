-- Menü sayfaları: Her menü birden fazla sayfaya sahip olabilir
-- Sayfa isimleri menus.pages_config'de, ürünlerin sayfa bilgisi menu_items.page_index'te

ALTER TABLE menus ADD COLUMN IF NOT EXISTS pages_config JSONB DEFAULT '[{"name":"Sayfa 1","order":0}]';
COMMENT ON COLUMN menus.pages_config IS 'Sayfa yapısı: [{"name":"İçecekler","order":0},{"name":"Yemekler","order":1}]';

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS page_index INTEGER DEFAULT 0;
COMMENT ON COLUMN menu_items.page_index IS 'Hangi sayfada (0-based)';
