-- ============================================
-- TEMPLATE SYSTEM SCHEMA
-- ============================================

-- Templates table - Predefined layout templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    block_count INTEGER NOT NULL CHECK (block_count >= 1 AND block_count <= 8),
    preview_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template blocks - Defines block positions for each template
CREATE TABLE IF NOT EXISTS template_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    block_index INTEGER NOT NULL CHECK (block_index >= 0),
    position_x DECIMAL(5, 2) NOT NULL CHECK (position_x >= 0 AND position_x <= 100), -- Percentage
    position_y DECIMAL(5, 2) NOT NULL CHECK (position_y >= 0 AND position_y <= 100), -- Percentage
    width DECIMAL(5, 2) NOT NULL CHECK (width > 0 AND width <= 100), -- Percentage
    height DECIMAL(5, 2) NOT NULL CHECK (height > 0 AND height <= 100), -- Percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, block_index)
);

-- Screen blocks - Links screens to template blocks
CREATE TABLE IF NOT EXISTS screen_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    template_block_id UUID NOT NULL REFERENCES template_blocks(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(screen_id, template_block_id)
);

-- Screen block contents - Content for each block
CREATE TABLE IF NOT EXISTS screen_block_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_block_id UUID NOT NULL REFERENCES screen_blocks(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN (
        'product_list',
        'single_product',
        'image',
        'icon',
        'text',
        'price',
        'campaign_badge'
    )),
    -- Content fields
    image_url TEXT,
    icon_name TEXT, -- Icon identifier (e.g., 'star', 'fire', 'new')
    title TEXT,
    description TEXT,
    price DECIMAL(10, 2),
    campaign_text TEXT, -- For badges: 'NEW', 'HOT', '%50'
    -- Styling
    background_color TEXT,
    background_image_url TEXT,
    text_color TEXT,
    -- Product reference (if content_type is product_list or single_product)
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    menu_id UUID REFERENCES menus(id) ON DELETE SET NULL, -- For product_list
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add template_id to screens table
ALTER TABLE screens ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_block_count ON templates(block_count);
CREATE INDEX IF NOT EXISTS idx_template_blocks_template_id ON template_blocks(template_id);
CREATE INDEX IF NOT EXISTS idx_template_blocks_block_index ON template_blocks(template_id, block_index);
CREATE INDEX IF NOT EXISTS idx_screen_blocks_screen_id ON screen_blocks(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_blocks_template_block_id ON screen_blocks(template_block_id);
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_screen_block_id ON screen_block_contents(screen_block_id);
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_content_type ON screen_block_contents(content_type);
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_menu_item_id ON screen_block_contents(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_menu_id ON screen_block_contents(menu_id);
CREATE INDEX IF NOT EXISTS idx_screens_template_id ON screens(template_id);

-- Triggers
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_blocks_updated_at BEFORE UPDATE ON template_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screen_blocks_updated_at BEFORE UPDATE ON screen_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screen_block_contents_updated_at BEFORE UPDATE ON screen_block_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT DEFAULT TEMPLATES
-- ============================================

-- 1. Single Layout (1 full screen)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('single', 'Single Layout', 'Full screen single block layout', 1, true, true)
ON CONFLICT (name) DO NOTHING;

-- 2. 2 Split Layout (50/50)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('split_2', '2 Split Layout', 'Two equal blocks side by side', 2, true, true)
ON CONFLICT (name) DO NOTHING;

-- 3. 3 Split Layout
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('split_3', '3 Split Layout', 'Three blocks layout', 3, true, true)
ON CONFLICT (name) DO NOTHING;

-- 4. 4 Split Layout (Grid 2x2)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_4', '4 Grid Layout', 'Four blocks in 2x2 grid', 4, true, true)
ON CONFLICT (name) DO NOTHING;

-- 5. 5 Split Layout
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('split_5', '5 Split Layout', 'Five blocks layout', 5, true, true)
ON CONFLICT (name) DO NOTHING;

-- 6. 6 Split Layout (Grid 2x3 or 3x2)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_6', '6 Grid Layout', 'Six blocks in grid layout', 6, true, true)
ON CONFLICT (name) DO NOTHING;

-- 7. 7 Split Layout (Grid 4x2)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_7', '7 Grid Layout', 'Seven blocks in 4x2 grid layout', 7, true, true)
ON CONFLICT (name) DO NOTHING;

-- 8. 8 Split Layout (Grid 4x2)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_8', '8 Grid Layout', 'Eight blocks in 4x2 grid layout', 8, true, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- INSERT TEMPLATE BLOCKS FOR EACH TEMPLATE
-- ============================================

-- Single Layout: 1 full block
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'single';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 100, 100)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 2 Split Layout: 2 blocks side by side (50/50)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'split_2';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 50, 100),
            (v_template_id, 1, 50, 0, 50, 100)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 3 Split Layout: 3 blocks (33.33% each)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'split_3';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 33.33, 100),
            (v_template_id, 1, 33.33, 0, 33.33, 100),
            (v_template_id, 2, 66.66, 0, 33.34, 100)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 4 Grid Layout: 2x2 grid
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_4';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 50, 50),
            (v_template_id, 1, 50, 0, 50, 50),
            (v_template_id, 2, 0, 50, 50, 50),
            (v_template_id, 3, 50, 50, 50, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 5 Split Layout: Custom 5-block layout
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'split_5';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 40, 50),
            (v_template_id, 1, 40, 0, 30, 50),
            (v_template_id, 2, 70, 0, 30, 50),
            (v_template_id, 3, 0, 50, 50, 50),
            (v_template_id, 4, 50, 50, 50, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 6 Grid Layout: 3x2 grid
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_6';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 33.33, 50),
            (v_template_id, 1, 33.33, 0, 33.33, 50),
            (v_template_id, 2, 66.66, 0, 33.34, 50),
            (v_template_id, 3, 0, 50, 33.33, 50),
            (v_template_id, 4, 33.33, 50, 33.33, 50),
            (v_template_id, 5, 66.66, 50, 33.34, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 7 Grid Layout: 4x2 grid (son blok 2 sütun kaplıyor)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_7';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 25, 50),
            (v_template_id, 1, 25, 0, 25, 50),
            (v_template_id, 2, 50, 0, 25, 50),
            (v_template_id, 3, 75, 0, 25, 50),
            (v_template_id, 4, 0, 50, 25, 50),
            (v_template_id, 5, 25, 50, 25, 50),
            (v_template_id, 6, 50, 50, 50, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 8 Grid Layout: 4x2 grid (tüm bloklar eşit)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_8';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 25, 50),
            (v_template_id, 1, 25, 0, 25, 50),
            (v_template_id, 2, 50, 0, 25, 50),
            (v_template_id, 3, 75, 0, 25, 50),
            (v_template_id, 4, 0, 50, 25, 50),
            (v_template_id, 5, 25, 50, 25, 50),
            (v_template_id, 6, 50, 50, 25, 50),
            (v_template_id, 7, 75, 50, 25, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;
