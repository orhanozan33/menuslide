-- Migration: Display scale indexes and optional fast path
-- Run after base schema. Reduces query time for /public/screen/:token (1000+ TVs).

-- ============================================
-- 1. INDEXES FOR DISPLAY PATH
-- ============================================

-- Screen lookup by public_slug / public_token (display URL)
CREATE INDEX IF NOT EXISTS idx_screens_public_slug_active
  ON screens(public_slug) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_screens_public_token_active
  ON screens(public_token) WHERE is_active = true;

-- Template rotations per screen
CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_screen_active
  ON screen_template_rotations(screen_id, display_order) WHERE is_active = true;

-- Block contents by template block (rotation path)
CREATE INDEX IF NOT EXISTS idx_template_block_contents_block_active
  ON template_block_contents(template_block_id, display_order) WHERE is_active = true;

-- Block contents by screen block (screen template path)
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_block_active
  ON screen_block_contents(screen_block_id, display_order) WHERE is_active = true;

-- Menu items by menu (product_list batch)
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_display
  ON menu_items(menu_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_menu_item_translations_item_lang
  ON menu_item_translations(menu_item_id, language_code);
