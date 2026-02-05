-- Her template için ayrı geçiş efekti (screen_template_rotations)
ALTER TABLE screen_template_rotations
ADD COLUMN IF NOT EXISTS transition_effect TEXT DEFAULT 'fade'
CHECK (transition_effect IN (
  'fade', 'slide-left', 'slide-right', 'zoom', 'flip', 'car-pull', 'curtain', 'wipe'
));

COMMENT ON COLUMN screen_template_rotations.transition_effect IS 'Bu templatee geçerken kullanılacak efekt';
