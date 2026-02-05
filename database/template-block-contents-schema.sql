-- ============================================
-- TEMPLATE BLOCK CONTENTS SCHEMA
-- Content for template blocks (for template editing)
-- ============================================

-- Template block contents - Content for each template block
CREATE TABLE IF NOT EXISTS template_block_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_block_id UUID NOT NULL REFERENCES template_blocks(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN (
        'product_list',
        'single_product',
        'image',
        'icon',
        'text',
        'price',
        'campaign_badge',
        'drink',
        'regional_menu'
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
    style_config JSONB, -- JSON configuration for positioning, sizing, etc.
    -- Product reference (if content_type is product_list or single_product)
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    menu_id UUID REFERENCES menus(id) ON DELETE SET NULL, -- For product_list
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_block_contents_template_block_id ON template_block_contents(template_block_id);
CREATE INDEX IF NOT EXISTS idx_template_block_contents_content_type ON template_block_contents(content_type);
CREATE INDEX IF NOT EXISTS idx_template_block_contents_menu_item_id ON template_block_contents(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_template_block_contents_menu_id ON template_block_contents(menu_id);
CREATE INDEX IF NOT EXISTS idx_template_block_contents_display_order ON template_block_contents(template_block_id, display_order);

-- Trigger for updated_at
CREATE TRIGGER update_template_block_contents_updated_at BEFORE UPDATE ON template_block_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE template_block_contents IS 'Content items for template blocks (used in template editor)';
COMMENT ON COLUMN template_block_contents.template_block_id IS 'Reference to template_block';
COMMENT ON COLUMN template_block_contents.content_type IS 'Type of content: image, icon, text, price, campaign_badge, etc.';
COMMENT ON COLUMN template_block_contents.image_url IS 'Image URL (can be base64 encoded)';
COMMENT ON COLUMN template_block_contents.icon_name IS 'Icon identifier/emoji';
COMMENT ON COLUMN template_block_contents.campaign_text IS 'Text for campaign badges (e.g., "NEW", "HOT", "%50")';
