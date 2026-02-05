-- Migration: Add 'drink' content type and style_config column to template_block_contents

-- First, drop the existing CHECK constraint
ALTER TABLE template_block_contents 
DROP CONSTRAINT IF EXISTS template_block_contents_content_type_check;

-- Add the new CHECK constraint with 'drink' included
ALTER TABLE template_block_contents 
ADD CONSTRAINT template_block_contents_content_type_check 
CHECK (content_type IN (
    'product_list',
    'single_product',
    'image',
    'icon',
    'text',
    'price',
    'campaign_badge',
    'drink'
));

-- Add style_config column if it doesn't exist
ALTER TABLE template_block_contents 
ADD COLUMN IF NOT EXISTS style_config JSONB;

-- Add comment
COMMENT ON COLUMN template_block_contents.style_config IS 'JSON configuration for positioning, sizing, and other style settings';
