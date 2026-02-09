-- Yeni geçiş efektleri: slide-up, slide-down, bounce, rotate, blur, cross-zoom, cube, card-flip
ALTER TABLE screen_template_rotations
DROP CONSTRAINT IF EXISTS screen_template_rotations_transition_effect_check;

ALTER TABLE screen_template_rotations
ADD CONSTRAINT screen_template_rotations_transition_effect_check
CHECK (transition_effect IN (
  'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down',
  'zoom', 'slide-zoom', 'flip', 'car-pull', 'curtain', 'wipe',
  'split', 'door', 'pixelate', 'glitch',
  'bounce', 'rotate', 'blur', 'cross-zoom', 'cube', 'card-flip'
));
