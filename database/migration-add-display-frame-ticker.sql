-- Add frame_type and ticker_text to screens table for TV display
-- frame_type: none | frame_1 .. frame_10 (10 modern frame models)
-- ticker_text: scrolling text line at bottom (no frame at bottom)

ALTER TABLE screens ADD COLUMN IF NOT EXISTS frame_type TEXT DEFAULT 'none';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ticker_text TEXT DEFAULT '';

COMMENT ON COLUMN screens.frame_type IS 'TV display frame: none, frame_1..frame_10';
COMMENT ON COLUMN screens.ticker_text IS 'Scrolling ticker text at bottom of TV display';
