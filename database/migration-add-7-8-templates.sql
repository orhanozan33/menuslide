-- ============================================
-- MIGRATION: Add 7 and 8 block templates
-- ============================================

-- 1. Update CHECK constraint to allow up to 8 blocks
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_block_count_check;
ALTER TABLE templates ADD CONSTRAINT templates_block_count_check CHECK (block_count >= 1 AND block_count <= 8);

-- 2. Insert 7 and 8 block templates
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_7', '7 Grid Layout', 'Seven blocks in 4x2 grid layout', 7, true, true),
    ('grid_8', '8 Grid Layout', 'Eight blocks in 4x2 grid layout', 8, true, true)
ON CONFLICT (name) DO NOTHING;

-- 3. Insert template blocks for 7 Grid Layout (4x2 grid, last block spans 2 columns)
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

-- 4. Insert template blocks for 8 Grid Layout (4x2 grid, all blocks equal)
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
