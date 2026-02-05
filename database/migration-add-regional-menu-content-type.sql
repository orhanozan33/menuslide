-- Migration: Add 'regional_menu' content type to template_block_contents

-- Drop the existing CHECK constraint
ALTER TABLE template_block_contents 
DROP CONSTRAINT IF EXISTS template_block_contents_content_type_check;

-- Add the new CHECK constraint with 'regional_menu' included
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
    'drink',
    'regional_menu'
));
