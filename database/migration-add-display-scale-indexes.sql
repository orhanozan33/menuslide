-- Migration: Display scale indexes (1000+ TVs)
-- Run after base schema. Optimizes /public/screen/:token queries.
-- Idempotent: safe to run multiple times.

CREATE INDEX IF NOT EXISTS idx_screens_public_slug_active
  ON screens(public_slug) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_screens_public_token_active
  ON screens(public_token) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_screen_active
  ON screen_template_rotations(screen_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_template_block_contents_block_active
  ON template_block_contents(template_block_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_screen_block_contents_block_active
  ON screen_block_contents(screen_block_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_menu_items_menu_display
  ON menu_items(menu_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_menu_item_translations_item_lang
  ON menu_item_translations(menu_item_id, language_code);
