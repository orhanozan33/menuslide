-- ============================================================
-- MENU SLIDE - SUPABASE SQL EDITOR İÇİN TAM SCRIPT
-- Bu dosyayı Supabase SQL Editor'e yapıştırıp Run'a basın
-- ============================================================

-- 1. UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. ANA TABLOLAR
-- ============================================

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'business_user' CHECK (role IN ('super_admin', 'business_user', 'admin')),
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    slide_duration INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    public_token TEXT NOT NULL UNIQUE,
    public_slug TEXT UNIQUE,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    animation_type TEXT DEFAULT 'fade' CHECK (animation_type IN ('fade', 'slide', 'zoom')),
    animation_duration INTEGER DEFAULT 500,
    language_code TEXT DEFAULT 'en',
    font_family TEXT DEFAULT 'system-ui',
    primary_color TEXT DEFAULT '#fbbf24',
    background_style TEXT DEFAULT 'gradient' CHECK (background_style IN ('gradient', 'solid', 'image')),
    background_color TEXT DEFAULT '#0f172a',
    background_image_url TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screen_menu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(screen_id, menu_id)
);

CREATE TABLE IF NOT EXISTS menu_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    day_of_week INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_day CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6))
);

CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_item_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(menu_item_id, language_code)
);

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    max_screens INTEGER NOT NULL,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2),
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_menus_business_id ON menus(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id ON menu_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_screens_business_id ON screens(business_id);
CREATE INDEX IF NOT EXISTS idx_screens_public_token ON screens(public_token);
CREATE INDEX IF NOT EXISTS idx_screens_public_slug ON screens(public_slug);
CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON subscriptions(business_id);

-- Trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Başlangıç verileri
INSERT INTO languages (code, name, is_default, is_active) VALUES
    ('en', 'English', true, true),
    ('es', 'Spanish', false, true),
    ('fr', 'French', false, true),
    ('de', 'German', false, true),
    ('it', 'Italian', false, true),
    ('pt', 'Portuguese', false, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active) VALUES
    ('basic', '1 Screen', 1, 14.99, 152.90, true),
    ('pro', '5 Screens', 5, 74.95, 764.49, true),
    ('enterprise', 'Enterprise Plan', -1, 149.99, 1529.89, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. ŞABLON SİSTEMİ
-- ============================================

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    block_count INTEGER NOT NULL CHECK (block_count >= 1 AND block_count <= 16),
    preview_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    block_index INTEGER NOT NULL CHECK (block_index >= 0),
    position_x DECIMAL(5, 2) NOT NULL,
    position_y DECIMAL(5, 2) NOT NULL,
    width DECIMAL(5, 2) NOT NULL,
    height DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, block_index)
);

CREATE TABLE IF NOT EXISTS screen_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    template_block_id UUID NOT NULL REFERENCES template_blocks(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(screen_id, template_block_id)
);

CREATE TABLE IF NOT EXISTS screen_block_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_block_id UUID NOT NULL REFERENCES screen_blocks(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    image_url TEXT,
    icon_name TEXT,
    title TEXT,
    description TEXT,
    price DECIMAL(10, 2),
    campaign_text TEXT,
    background_color TEXT,
    background_image_url TEXT,
    text_color TEXT,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE screens ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id) ON DELETE SET NULL;

-- Varsayılan şablonlar
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('single', 'Single Layout', 'Full screen single block', 1, true, true),
    ('split_2', '2 Split Layout', 'Two blocks side by side', 2, true, true),
    ('split_3', '3 Split Layout', 'Three blocks layout', 3, true, true),
    ('grid_4', '4 Grid Layout', 'Four blocks 2x2', 4, true, true),
    ('split_5', '5 Split Layout', 'Five blocks layout', 5, true, true),
    ('grid_6', '6 Grid Layout', 'Six blocks grid', 6, true, true),
    ('grid_7', '7 Grid Layout', 'Seven blocks', 7, true, true),
    ('grid_8', '8 Grid Layout', 'Eight blocks 4x2', 8, true, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. TEMPLATE BLOCK CONTENTS (şablon editörü)
-- ============================================

CREATE TABLE IF NOT EXISTS template_block_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_block_id UUID NOT NULL REFERENCES template_blocks(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
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

-- ============================================
-- 5. İÇERİK KÜTÜPHANESİ
-- ============================================

CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('image', 'icon', 'background', 'drink', 'text')),
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_library_category ON content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON content_library(type);

-- ============================================
-- 6. İLETİŞİM BİLGİSİ VE ANA SAYFA KANALLARI
-- ============================================

CREATE TABLE IF NOT EXISTS contact_info (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO contact_info (id, email, phone, address, whatsapp)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '', '', '', '')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS home_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================
-- TAMAMLANDI - Tablolar oluşturuldu
-- Not: Ek migration dosyaları (kolon ekleme vb.) database/ klasöründen
-- ayrıca çalıştırılabilir.
-- ============================================================
