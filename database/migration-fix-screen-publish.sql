-- Yayınlama sonrası "Henüz template yayınlanmamış" görünmesini önlemek için:
-- 1) Full Editor şablonları için template_id nullable, full_editor_template_id sütunu
-- 2) Tüm geçiş efektleri için CHECK güncellemesi
-- Bu dosyayı Supabase SQL Editor'da veya yerel PostgreSQL'de çalıştırın.

-- template_id nullable (full_editor rotasyonlarında null)
ALTER TABLE screen_template_rotations
  ALTER COLUMN template_id DROP NOT NULL;

-- full_editor_template_id (yoksa ekle)
ALTER TABLE screen_template_rotations
  ADD COLUMN IF NOT EXISTS full_editor_template_id UUID REFERENCES full_editor_templates(id) ON DELETE CASCADE;

ALTER TABLE screen_template_rotations
  ADD COLUMN IF NOT EXISTS template_type TEXT;

-- transition_effect CHECK: eski kısıtı kaldır, yeni efekt listesiyle ekle
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

-- transition_duration (yoksa ekle)
ALTER TABLE screen_template_rotations
  ADD COLUMN IF NOT EXISTS transition_duration INTEGER DEFAULT 1400;
