-- Add TV UI Customization Fields to Screens Table
-- Run this after add_advanced_features.sql

-- Add UI customization fields
ALTER TABLE screens
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'system-ui',
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#fbbf24', -- Amber/gold default
ADD COLUMN IF NOT EXISTS background_style TEXT DEFAULT 'gradient' CHECK (background_style IN ('gradient', 'solid', 'image')),
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#0f172a', -- Slate 900
ADD COLUMN IF NOT EXISTS background_image_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_screens_ui_config ON screens(font_family, primary_color);

-- Update RLS policy to allow reading these fields (already covered by existing policies)

COMMENT ON COLUMN screens.font_family IS 'Font family for TV display (e.g., system-ui, serif, sans-serif)';
COMMENT ON COLUMN screens.primary_color IS 'Primary accent color (hex format)';
COMMENT ON COLUMN screens.background_style IS 'Background style: gradient, solid, or image';
COMMENT ON COLUMN screens.background_color IS 'Background color (hex format)';
COMMENT ON COLUMN screens.background_image_url IS 'URL for background image (if background_style is image)';
COMMENT ON COLUMN screens.logo_url IS 'Business logo URL to display on TV';
