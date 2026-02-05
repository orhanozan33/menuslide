-- ============================================
-- TEMPLATE EDITOR SCHEMA UPDATES
-- Drag & Drop Editor Support
-- ============================================

-- Add drag & drop fields to screen_blocks table
ALTER TABLE screen_blocks 
  ADD COLUMN IF NOT EXISTS position_x DECIMAL(5, 2) CHECK (position_x >= 0 AND position_x <= 100),
  ADD COLUMN IF NOT EXISTS position_y DECIMAL(5, 2) CHECK (position_y >= 0 AND position_y <= 100),
  ADD COLUMN IF NOT EXISTS width DECIMAL(5, 2) CHECK (width > 0 AND width <= 100),
  ADD COLUMN IF NOT EXISTS height DECIMAL(5, 2) CHECK (height > 0 AND height <= 100),
  ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'fade' CHECK (animation_type IN ('fade', 'slide', 'zoom', 'rotate', 'none')),
  ADD COLUMN IF NOT EXISTS animation_duration INTEGER DEFAULT 500 CHECK (animation_duration >= 100 AND animation_duration <= 5000),
  ADD COLUMN IF NOT EXISTS animation_delay INTEGER DEFAULT 0 CHECK (animation_delay >= 0 AND animation_delay <= 2000),
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_width DECIMAL(5, 2) DEFAULT 10 CHECK (min_width >= 5 AND min_width <= 50),
  ADD COLUMN IF NOT EXISTS min_height DECIMAL(5, 2) DEFAULT 10 CHECK (min_height >= 5 AND min_height <= 50);

-- Initialize position data from template_blocks if not set
UPDATE screen_blocks sb
SET 
  position_x = tb.position_x,
  position_y = tb.position_y,
  width = tb.width,
  height = tb.height
FROM template_blocks tb
WHERE sb.template_block_id = tb.id 
  AND sb.position_x IS NULL;

-- Add index for z_index sorting
CREATE INDEX IF NOT EXISTS idx_screen_blocks_z_index ON screen_blocks(screen_id, z_index);

-- Add index for position queries
CREATE INDEX IF NOT EXISTS idx_screen_blocks_position ON screen_blocks(screen_id, position_x, position_y);

-- Add language support to screen_block_contents
ALTER TABLE screen_block_contents
  ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'en';

-- Create index for language queries
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_language ON screen_block_contents(screen_block_id, language_code);

-- Add undo/redo history table (optional, for advanced features)
CREATE TABLE IF NOT EXISTS screen_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('move', 'resize', 'add', 'delete', 'content', 'animation', 'layer')),
    block_id UUID REFERENCES screen_blocks(id) ON DELETE SET NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screen_edit_history_screen ON screen_edit_history(screen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screen_edit_history_user ON screen_edit_history(user_id, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN screen_blocks.position_x IS 'X position in percentage (0-100) - editable via drag & drop';
COMMENT ON COLUMN screen_blocks.position_y IS 'Y position in percentage (0-100) - editable via drag & drop';
COMMENT ON COLUMN screen_blocks.width IS 'Width in percentage (0-100) - editable via resize';
COMMENT ON COLUMN screen_blocks.height IS 'Height in percentage (0-100) - editable via resize';
COMMENT ON COLUMN screen_blocks.z_index IS 'Layer order - higher values appear on top';
COMMENT ON COLUMN screen_blocks.animation_type IS 'Animation type for this block: fade, slide, zoom, rotate, none';
COMMENT ON COLUMN screen_blocks.animation_duration IS 'Animation duration in milliseconds (100-5000)';
COMMENT ON COLUMN screen_blocks.animation_delay IS 'Animation delay in milliseconds (0-2000)';
COMMENT ON COLUMN screen_blocks.is_locked IS 'If true, block cannot be moved or resized';
