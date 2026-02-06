-- Yerel → Supabase import uyumluluğu: Export'taki sütunlar Supabase'de yoksa ekle.
-- content_library.source (yerelde var, bootstrap'ta yoktu)
ALTER TABLE content_library ADD COLUMN IF NOT EXISTS source TEXT;
-- screen_template_rotations.template_type, digital_menu_template_id (yerelde var, bootstrap'ta yoktu)
ALTER TABLE screen_template_rotations ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE screen_template_rotations ADD COLUMN IF NOT EXISTS digital_menu_template_id UUID;
-- menu_items: yerelde olan sütunlar (tags, upsell, variants, sayfa vb.) yoksa menu_items INSERT'leri patlar, paketler/ürünler gelmez
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS upsell_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS time_slots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS tv_featured BOOLEAN DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS page_index INTEGER DEFAULT 0;
-- templates: export'ta kullanılan sütunlar (bootstrap'ta yoksa INSERT "column does not exist" verir, hiç şablon girmez)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS ai_generation_params JSONB;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'system';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS animated_zone_config JSONB;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS canvas_design JSONB;
-- templates.name UNIQUE kaldır: yerelde aynı isimde şablon olunca ikinci INSERT patlamasın, tüm şablonlar girsin
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_name_key;
-- template_blocks: yerelde olan sütunlar yoksa INSERT patlar, düzenleme sayfasında "0 blok" kalır
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'fade';
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS animation_duration INTEGER DEFAULT 500;
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS animation_delay INTEGER DEFAULT 0;
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT '{}'::jsonb;
