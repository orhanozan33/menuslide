-- ============================================
-- TEXT CONTENT ENHANCEMENTS
-- Text position, size, and icon pack support
-- ============================================

-- Add text positioning and sizing fields
ALTER TABLE screen_block_contents
  ADD COLUMN IF NOT EXISTS text_position_x DECIMAL(5, 2) DEFAULT 50 CHECK (text_position_x >= 0 AND text_position_x <= 100),
  ADD COLUMN IF NOT EXISTS text_position_y DECIMAL(5, 2) DEFAULT 50 CHECK (text_position_y >= 0 AND text_position_y <= 100),
  ADD COLUMN IF NOT EXISTS text_size INTEGER DEFAULT 16 CHECK (text_size >= 8 AND text_size <= 200),
  ADD COLUMN IF NOT EXISTS font_weight TEXT DEFAULT 'normal' CHECK (font_weight IN ('normal', 'bold', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'));

-- Add icon pack support (icon_name will store icon identifier from pack)
-- icon_name already exists, we'll use it for icon pack selection

COMMENT ON COLUMN screen_block_contents.text_position_x IS 'Text X position in percentage (0-100) within block';
COMMENT ON COLUMN screen_block_contents.text_position_y IS 'Text Y position in percentage (0-100) within block';
COMMENT ON COLUMN screen_block_contents.text_size IS 'Text font size in pixels (8-200)';
COMMENT ON COLUMN screen_block_contents.font_weight IS 'Text font weight';
