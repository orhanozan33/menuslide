-- Full Editor şablonlarının TV rotasyonunda kullanılması için
-- screen_template_rotations tablosuna full_editor_template_id eklenir.
-- template_id bu durumda null olabilir.

-- template_id'yi nullable yap (full_editor rotasyonlarında null)
ALTER TABLE screen_template_rotations
  ALTER COLUMN template_id DROP NOT NULL;

-- full_editor_template_id sütunu (Full Editor şablonu referansı)
ALTER TABLE screen_template_rotations
  ADD COLUMN IF NOT EXISTS full_editor_template_id UUID REFERENCES full_editor_templates(id) ON DELETE CASCADE;

-- template_type zaten var (digital_menu için), full_editor değeri eklenir
COMMENT ON COLUMN screen_template_rotations.full_editor_template_id IS 'Full Editor şablonu ID (template_type=full_editor ise)';
