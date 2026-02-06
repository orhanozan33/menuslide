-- Yerel DB Tamamlama Migration
-- Frontend ile uyum için eksik tablolar ve sütunlar
-- Çalıştırma: psql -U postgres -d tvproje -f migration-local-complete.sql

-- ============================================
-- 1. USERS TABLOSU GÜNCELLEMELERİ
-- ============================================
-- Admin rolü
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin', 'business_user'));

-- Referans numarası ve dil tercihi
ALTER TABLE users ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en' CHECK (preferred_locale IN ('en', 'tr', 'fr'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reference_number ON users (reference_number) WHERE reference_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users (referred_by_user_id) WHERE referred_by_user_id IS NOT NULL;

-- ============================================
-- 2. TEMPLATES TABLOSU (önce - screens FK için gerekli)
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  block_count INTEGER NOT NULL DEFAULT 1 CHECK (block_count >= 1 AND block_count <= 16),
  preview_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_generated BOOLEAN DEFAULT false,
  ai_generation_params JSONB,
  scope TEXT DEFAULT 'system' CHECK (scope IN ('system', 'user')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  animated_zone_config JSONB,
  canvas_design JSONB
);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_business_id ON templates(business_id);
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Screens ek sütunlar + template_id FK
ALTER TABLE screens ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS frame_type TEXT DEFAULT 'none';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ticker_text TEXT DEFAULT '';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ticker_style TEXT DEFAULT 'default';
ALTER TABLE screens DROP CONSTRAINT IF EXISTS screens_template_id_fkey;
ALTER TABLE screens ADD CONSTRAINT screens_template_id_fkey 
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;

-- ============================================
-- 4. TEMPLATE_BLOCKS
-- ============================================
CREATE TABLE IF NOT EXISTS template_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  block_index INTEGER NOT NULL CHECK (block_index >= 0),
  position_x DECIMAL(5, 2) NOT NULL DEFAULT 0,
  position_y DECIMAL(5, 2) NOT NULL DEFAULT 0,
  width DECIMAL(5, 2) NOT NULL DEFAULT 100,
  height DECIMAL(5, 2) NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  z_index INTEGER DEFAULT 0,
  animation_type TEXT DEFAULT 'fade',
  animation_duration INTEGER DEFAULT 500,
  animation_delay INTEGER DEFAULT 0,
  style_config JSONB DEFAULT '{}'::jsonb,
  UNIQUE(template_id, block_index)
);
CREATE INDEX IF NOT EXISTS idx_template_blocks_template_id ON template_blocks(template_id);
CREATE TRIGGER update_template_blocks_updated_at BEFORE UPDATE ON template_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. SCREEN_BLOCKS
-- ============================================
CREATE TABLE IF NOT EXISTS screen_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  template_block_id UUID NOT NULL REFERENCES template_blocks(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  position_x DECIMAL(5, 2),
  position_y DECIMAL(5, 2),
  width DECIMAL(5, 2),
  height DECIMAL(5, 2),
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(screen_id, template_block_id)
);
CREATE INDEX IF NOT EXISTS idx_screen_blocks_screen_id ON screen_blocks(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_blocks_template_block_id ON screen_blocks(template_block_id);
CREATE TRIGGER update_screen_blocks_updated_at BEFORE UPDATE ON screen_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. TEMPLATE_BLOCK_CONTENTS
-- ============================================
CREATE TABLE IF NOT EXISTS template_block_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_block_id UUID NOT NULL REFERENCES template_blocks(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'product_list', 'single_product', 'image', 'icon', 'text', 'price',
    'campaign_badge', 'drink', 'regional_menu'
  )),
  image_url TEXT,
  icon_name TEXT,
  title TEXT,
  description TEXT,
  price DECIMAL(10, 2),
  campaign_text TEXT,
  background_color TEXT,
  background_image_url TEXT,
  text_color TEXT,
  style_config JSONB,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_template_block_contents_template_block ON template_block_contents(template_block_id);
CREATE TRIGGER update_template_block_contents_updated_at BEFORE UPDATE ON template_block_contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. SCREEN_BLOCK_CONTENTS
-- ============================================
CREATE TABLE IF NOT EXISTS screen_block_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_block_id UUID NOT NULL REFERENCES screen_blocks(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'product_list', 'single_product', 'image', 'icon', 'text', 'price',
    'campaign_badge', 'drink', 'regional_menu'
  )),
  image_url TEXT,
  icon_name TEXT,
  title TEXT,
  description TEXT,
  price DECIMAL(10, 2),
  campaign_text TEXT,
  background_color TEXT,
  background_image_url TEXT,
  text_color TEXT,
  style_config JSONB,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  language_code TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_screen_block ON screen_block_contents(screen_block_id);
CREATE TRIGGER update_screen_block_contents_updated_at BEFORE UPDATE ON screen_block_contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. SCREEN_TEMPLATE_ROTATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS screen_template_rotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  display_duration INTEGER NOT NULL DEFAULT 5,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_screen ON screen_template_rotations(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_template ON screen_template_rotations(template_id);
CREATE TRIGGER update_screen_template_rotations_updated_at BEFORE UPDATE ON screen_template_rotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. CONTENT_LIBRARY
-- ============================================
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('image', 'icon', 'background', 'drink', 'text', 'video')),
  url TEXT,
  content TEXT,
  icon VARCHAR(50),
  gradient TEXT,
  color VARCHAR(20),
  template VARCHAR(50),
  sample TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_library_category ON content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON content_library(type);
CREATE INDEX IF NOT EXISTS idx_content_library_active ON content_library(is_active);

-- ============================================
-- 10. CONTENT_LIBRARY_CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS content_library_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(20) DEFAULT '📦',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('food', 'Yiyecekler', '🍕', 0),
  ('pasta', 'Makarnalar', '🍝', 1),
  ('drinks', 'İçecekler', '🍹', 2),
  ('icons', 'İkonlar', '🎨', 3),
  ('badges', 'Rozetler', '🏷️', 4),
  ('backgrounds', 'Arka Planlar', '🖼️', 5),
  ('text', 'Metin Şablonları', '📝', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 11. DISPLAY_VIEWERS (heartbeat)
-- ============================================
CREATE TABLE IF NOT EXISTS display_viewers (
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (screen_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_display_viewers_last_seen ON display_viewers(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_display_viewers_screen_id ON display_viewers(screen_id);

-- ============================================
-- 12. REGISTRATION_REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tv_count TEXT,
  address TEXT,
  province TEXT,
  city TEXT,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'registered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created ON registration_requests(created_at DESC);

-- ============================================
-- 13. ADMIN_PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR(80) NOT NULL,
  permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'full')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(user_id);

-- ============================================
-- 14. SUBSCRIPTIONS - billing_interval
-- ============================================
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (billing_interval IN ('monthly', 'yearly'));
