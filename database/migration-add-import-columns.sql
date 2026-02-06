-- Yerel → Supabase import uyumluluğu: Export'taki sütunlar Supabase'de yoksa ekle.
-- content_library.source (yerelde var, bootstrap'ta yoktu)
ALTER TABLE content_library ADD COLUMN IF NOT EXISTS source TEXT;
-- screen_template_rotations.template_type, digital_menu_template_id (yerelde var, bootstrap'ta yoktu)
ALTER TABLE screen_template_rotations ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE screen_template_rotations ADD COLUMN IF NOT EXISTS digital_menu_template_id UUID;
-- templates.name UNIQUE kaldır: yerelde aynı isimde şablon olunca ikinci INSERT patlamasın, tüm şablonlar girsin
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_name_key;
