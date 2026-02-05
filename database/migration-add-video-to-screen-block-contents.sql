-- Migration: Add 'video' content type to screen_block_contents

ALTER TABLE screen_block_contents 
DROP CONSTRAINT IF EXISTS screen_block_contents_content_type_check;

ALTER TABLE screen_block_contents 
ADD CONSTRAINT screen_block_contents_content_type_check 
CHECK (content_type IN (
    'product_list',
    'single_product',
    'image',
    'icon',
    'text',
    'price',
    'campaign_badge',
    'drink',
    'regional_menu',
    'video'
));
