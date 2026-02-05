-- Template geçiş efekti: şablon değişiminde kullanılacak efekt (fade, slide-left, car-pull, curtain, flip, zoom, wipe)
ALTER TABLE screens
ADD COLUMN IF NOT EXISTS template_transition_effect TEXT DEFAULT 'fade'
CHECK (template_transition_effect IN (
  'fade', 'slide-left', 'slide-right', 'zoom', 'flip', 'car-pull', 'curtain', 'wipe'
));

COMMENT ON COLUMN screens.template_transition_effect IS 'Template rotation geçiş efekti: fade, slide-left, slide-right, zoom, flip, car-pull, curtain, wipe';
