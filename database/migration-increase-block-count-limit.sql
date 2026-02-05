-- ============================================
-- MIGRATION: Increase block_count limit to 16
-- ============================================

-- Update CHECK constraint to allow up to 16 blocks
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_block_count_check;
ALTER TABLE templates ADD CONSTRAINT templates_block_count_check CHECK (block_count >= 1 AND block_count <= 16);
