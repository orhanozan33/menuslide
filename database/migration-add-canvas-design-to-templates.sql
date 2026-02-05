-- Add canvas_design column for templates created from CanvasDesignEditor
-- When set, template uses Konva shapes (text, image, video, imageRotation) + backgroundColor + layoutType
ALTER TABLE templates ADD COLUMN IF NOT EXISTS canvas_design JSONB;

COMMENT ON COLUMN templates.canvas_design IS 'Canvas editor design data: { shapes, backgroundColor, layoutType } - used when template created from /editor';
