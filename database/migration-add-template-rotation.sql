-- Migration: Add Template Rotation System
-- Allows multiple templates to be scheduled for a screen with display durations

CREATE TABLE IF NOT EXISTS screen_template_rotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    display_duration INTEGER NOT NULL DEFAULT 5, -- seconds
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(screen_id, template_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_screen_id ON screen_template_rotations(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_template_id ON screen_template_rotations(template_id);
CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_active ON screen_template_rotations(screen_id, is_active, display_order);

CREATE TRIGGER update_screen_template_rotations_updated_at BEFORE UPDATE ON screen_template_rotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
