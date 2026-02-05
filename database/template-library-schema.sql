-- ============================================
-- TEMPLATE LIBRARY SYSTEM SCHEMA
-- Save, Reuse, and Library System
-- ============================================

-- Update templates table to support user templates
ALTER TABLE templates 
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'system' CHECK (scope IN ('system', 'user')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Update template_blocks to include animation and style config
ALTER TABLE template_blocks
  ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'fade' CHECK (animation_type IN ('fade', 'slide', 'zoom', 'rotate', 'none')),
  ADD COLUMN IF NOT EXISTS animation_duration INTEGER DEFAULT 500 CHECK (animation_duration >= 100 AND animation_duration <= 5000),
  ADD COLUMN IF NOT EXISTS animation_delay INTEGER DEFAULT 0 CHECK (animation_delay >= 0 AND animation_delay <= 2000),
  ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT '{}'::jsonb;

-- Indexes for template library queries
CREATE INDEX IF NOT EXISTS idx_templates_scope ON templates(scope);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_business_id ON templates(business_id);
CREATE INDEX IF NOT EXISTS idx_templates_scope_business ON templates(scope, business_id) WHERE scope = 'user';

-- Update existing system templates to have scope = 'system'
UPDATE templates SET scope = 'system' WHERE is_system = true AND (scope IS NULL OR scope != 'system');

-- Function to duplicate a template
CREATE OR REPLACE FUNCTION duplicate_template(
  source_template_id UUID,
  new_name TEXT,
  new_display_name TEXT,
  new_created_by UUID,
  new_business_id UUID
) RETURNS UUID AS $$
DECLARE
  new_template_id UUID;
BEGIN
  -- Create new template
  INSERT INTO templates (
    name,
    display_name,
    description,
    block_count,
    preview_image_url,
    is_active,
    is_system,
    scope,
    created_by,
    business_id
  )
  SELECT
    new_name,
    new_display_name,
    description,
    block_count,
    preview_image_url,
    is_active,
    false, -- Duplicated templates are never system templates
    'user', -- Duplicated templates are user templates
    new_created_by,
    new_business_id
  FROM templates
  WHERE id = source_template_id
  RETURNING id INTO new_template_id;

  -- Copy template blocks
  INSERT INTO template_blocks (
    template_id,
    block_index,
    position_x,
    position_y,
    width,
    height,
    z_index,
    animation_type,
    animation_duration,
    animation_delay,
    style_config
  )
  SELECT
    new_template_id,
    block_index,
    position_x,
    position_y,
    width,
    height,
    COALESCE(z_index, 0),
    COALESCE(animation_type, 'fade'),
    COALESCE(animation_duration, 500),
    COALESCE(animation_delay, 0),
    COALESCE(style_config, '{}'::jsonb)
  FROM template_blocks
  WHERE template_id = source_template_id;

  RETURN new_template_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN templates.scope IS 'Template scope: system (platform-defined) or user (user-created)';
COMMENT ON COLUMN templates.created_by IS 'User who created this template (NULL for system templates)';
COMMENT ON COLUMN templates.business_id IS 'Business that owns this template (for user templates)';
COMMENT ON COLUMN template_blocks.z_index IS 'Layer order for blocks';
COMMENT ON COLUMN template_blocks.animation_type IS 'Animation type for block';
COMMENT ON COLUMN template_blocks.animation_duration IS 'Animation duration in milliseconds';
COMMENT ON COLUMN template_blocks.animation_delay IS 'Animation delay in milliseconds';
COMMENT ON COLUMN template_blocks.style_config IS 'JSON configuration for block styles (colors, fonts, etc.)';
