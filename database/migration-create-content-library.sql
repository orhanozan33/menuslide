-- Migration: Create content_library table for managing library images

CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('image', 'icon', 'background', 'drink', 'text')),
  url TEXT,
  content TEXT, -- For emoji icons
  icon VARCHAR(50), -- Category icon
  gradient TEXT, -- For gradient backgrounds
  color VARCHAR(20), -- For solid color backgrounds
  template VARCHAR(50), -- For text templates
  sample TEXT, -- Sample text for text templates
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster category queries
CREATE INDEX IF NOT EXISTS idx_content_library_category ON content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON content_library(type);
CREATE INDEX IF NOT EXISTS idx_content_library_active ON content_library(is_active);

-- Add comment
COMMENT ON TABLE content_library IS 'Content library for images, icons, backgrounds, drinks, and text templates';
COMMENT ON COLUMN content_library.category IS 'Category name (food, drinks, icons, backgrounds, text)';
COMMENT ON COLUMN content_library.type IS 'Content type (image, icon, background, drink, text)';
COMMENT ON COLUMN content_library.url IS 'Image URL (can be external URL or base64)';
COMMENT ON COLUMN content_library.content IS 'Emoji or text content for icons';
