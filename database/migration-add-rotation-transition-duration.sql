-- Geçiş hızı (ms): her template için geçiş animasyonu süresi
ALTER TABLE screen_template_rotations
ADD COLUMN IF NOT EXISTS transition_duration INTEGER DEFAULT 1400;
COMMENT ON COLUMN screen_template_rotations.transition_duration IS 'Bu templatee geçiş animasyonu süresi (ms)';
