-- Import öncesi: export-from-local-data.sql ile uyumlu olması için eksik sütunları ekle
-- Bu dosyayı import'tan önce bir kez çalıştırın (veya import script otomatik çalıştırır).

-- businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS qr_background_image_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS qr_background_color VARCHAR(32);

-- menus (pages_config)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS pages_config JSONB DEFAULT '[]'::jsonb;

-- screens
ALTER TABLE screens ADD COLUMN IF NOT EXISTS template_transition_effect TEXT;

-- subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval TEXT;

-- menu_items (ek alanlar)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS upsell_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS time_slots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS tv_featured BOOLEAN DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS page_index INTEGER DEFAULT 0;

-- templates: import sırasında çakışmayı önlemek için unique/ FK gevşet (isteğe bağlı)
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_name_key;
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_created_by_fkey;
-- templates (şablonlar sayfası için)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS ai_generation_params JSONB;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'system';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS animated_zone_config JSONB;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS canvas_design JSONB;

-- screen_blocks
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS position_x NUMERIC DEFAULT 0;
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS position_y NUMERIC DEFAULT 0;
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS width NUMERIC DEFAULT 100;
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS height NUMERIC DEFAULT 100;
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'fade';
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS animation_duration INTEGER DEFAULT 500;
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS animation_delay INTEGER DEFAULT 0;
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS min_width VARCHAR(20);
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS min_height VARCHAR(20);
ALTER TABLE screen_blocks ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT '{}'::jsonb;

-- template_blocks
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'fade';
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS animation_duration INTEGER DEFAULT 500;
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS animation_delay INTEGER DEFAULT 0;
ALTER TABLE template_blocks ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT '{}'::jsonb;

-- content_library (İçerik Kütüphanesi import için)
-- Tablo yoksa oluştur (Supabase’de bazen sadece şablon şeması vardır)
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  url TEXT,
  content TEXT,
  icon VARCHAR(50),
  gradient TEXT,
  color VARCHAR(20),
  template VARCHAR(50),
  sample TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_content_library_category ON content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON content_library(type);
-- Eski CHECK 'video' tipini engelliyorsa kaldır (import’taki video kayıtları için)
ALTER TABLE content_library DROP CONSTRAINT IF EXISTS content_library_type_check;
ALTER TABLE content_library ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE content_library ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- content_library: Supabase'de olmayan user id ile gelen satırlarda FK ihlali olmasın (uploaded_by → NULL)
CREATE OR REPLACE FUNCTION content_library_null_uploaded_by_if_missing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.uploaded_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.uploaded_by) THEN
    NEW.uploaded_by := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_content_library_uploaded_by ON content_library;
CREATE TRIGGER trg_content_library_uploaded_by
  BEFORE INSERT OR UPDATE ON content_library
  FOR EACH ROW EXECUTE PROCEDURE content_library_null_uploaded_by_if_missing();

-- Eksik tablolar (export'taki INSERT'ler için; yoksa oluştur)
CREATE TABLE IF NOT EXISTS content_library_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(20) DEFAULT '📦',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS screen_template_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  display_duration INTEGER NOT NULL DEFAULT 5,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE screen_template_rotations ADD COLUMN IF NOT EXISTS transition_effect TEXT;
ALTER TABLE screen_template_rotations ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE screen_template_rotations ADD COLUMN IF NOT EXISTS digital_menu_template_id UUID;

CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR(80) NOT NULL,
  permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'full')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);
ALTER TABLE admin_permissions ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '{}'::jsonb;

-- home_channels (ana sayfa kanal listesi; seed-empty-tables için)
CREATE TABLE IF NOT EXISTS home_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL DEFAULT 'channel',
  title TEXT NOT NULL DEFAULT 'Channel',
  description TEXT,
  link TEXT,
  thumbnail TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_home_channels_order ON home_channels(display_order);

-- payment_failures (Reports / payment-status için; Supabase’de yoksa 500 hatası önlenir)
CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'cad',
  failure_reason TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_failures_subscription_id ON payment_failures(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_business_id ON payment_failures(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_attempted_at ON payment_failures(attempted_at DESC);

-- qr_menus (QR Menü sayfası; yoksa qr-menus endpoint 500 verir)
CREATE TABLE IF NOT EXISTS qr_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  screen_id UUID REFERENCES screens(id) ON DELETE SET NULL,
  qr_code_url TEXT,
  qr_code_data TEXT,
  token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  show_allergens BOOLEAN DEFAULT false,
  show_calories BOOLEAN DEFAULT false,
  show_ingredients BOOLEAN DEFAULT false,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS qr_menus_token_key ON qr_menus(token);
CREATE INDEX IF NOT EXISTS idx_qr_menus_business_id ON qr_menus(business_id);
CREATE INDEX IF NOT EXISTS idx_qr_menus_screen_id ON qr_menus(screen_id);

CREATE TABLE IF NOT EXISTS qr_menu_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_menu_id UUID NOT NULL REFERENCES qr_menus(id) ON DELETE CASCADE,
  device_type TEXT,
  user_agent TEXT,
  ip_address TEXT,
  language_code TEXT DEFAULT 'en',
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qr_menu_views_qr_menu_id ON qr_menu_views(qr_menu_id);
CREATE INDEX IF NOT EXISTS idx_qr_menu_views_viewed_at ON qr_menu_views(viewed_at);

CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS TEXT AS $$
  SELECT encode(gen_random_bytes(16), 'hex');
$$ LANGUAGE sql;

-- Backend bir kerelik import için: bu tabloda kayıt varsa tekrar çalışmaz
CREATE TABLE IF NOT EXISTS _one_time_import_done (
  id SERIAL PRIMARY KEY,
  done_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HELPER FUNCTIONS (PublicController / getScreen için gerekli)
-- ============================================
CREATE OR REPLACE FUNCTION get_active_menu_for_screen(p_screen_id UUID)
RETURNS UUID AS $$
DECLARE
    v_menu_id UUID;
    v_current_time TIME;
    v_current_day INTEGER;
BEGIN
    v_current_time := CURRENT_TIME;
    v_current_day := EXTRACT(DOW FROM CURRENT_TIMESTAMP)::INTEGER;

    SELECT menu_id INTO v_menu_id
    FROM menu_schedules
    WHERE screen_id = p_screen_id
      AND is_active = true
      AND (day_of_week IS NULL OR day_of_week = v_current_day)
      AND start_time <= v_current_time
      AND end_time > v_current_time
    ORDER BY start_time DESC
    LIMIT 1;

    IF v_menu_id IS NULL THEN
        SELECT menu_id INTO v_menu_id
        FROM screen_menu
        WHERE screen_id = p_screen_id
        ORDER BY display_order ASC
        LIMIT 1;
    END IF;

    RETURN v_menu_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_screen_limit(p_business_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_screens INTEGER;
    v_current_screens INTEGER;
    v_subscription_status TEXT;
BEGIN
    SELECT s.status, p.max_screens INTO v_subscription_status, v_max_screens
    FROM subscriptions s
    INNER JOIN plans p ON s.plan_id = p.id
    WHERE s.business_id = p_business_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF v_subscription_status IS NULL OR v_subscription_status != 'active' THEN
        RETURN false;
    END IF;

    IF v_max_screens = -1 THEN
        RETURN true;
    END IF;

    SELECT COUNT(*) INTO v_current_screens
    FROM screens
    WHERE business_id = p_business_id;

    RETURN v_current_screens < v_max_screens;
END;
$$ LANGUAGE plpgsql;
