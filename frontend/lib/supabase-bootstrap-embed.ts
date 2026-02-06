// Auto-generated. Do not edit. Run ./scripts/build-supabase-bootstrap.sh to regenerate.
export const bootstrapSql = `-- Supabase bootstrap: tüm şema + migration'lar (tek seferde çalıştırılabilir)
-- Üretim: 2026-02-06 03:35:19 UTC

-- === schema-local.sql ===
-- Digital Signage / Online Menu Management System
-- Local PostgreSQL Schema (without Supabase dependencies)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BUSINESSES TABLE (must be created first)
-- ============================================
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USERS TABLE (Local Auth - no Supabase dependency)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- bcrypt hash
    role TEXT NOT NULL DEFAULT 'business_user' CHECK (role IN ('super_admin', 'business_user')),
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MENUS TABLE
-- ============================================
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

-- ============================================
-- MENU ITEMS TABLE
-- ============================================
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

-- ============================================
-- SCREENS TABLE (TVs)
-- ============================================
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

-- ============================================
-- SCREEN_MENU RELATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS screen_menu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(screen_id, menu_id)
);

-- ============================================
-- MENU SCHEDULES TABLE
-- ============================================
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

-- ============================================
-- LANGUAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MENU ITEM TRANSLATIONS TABLE
-- ============================================
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

-- ============================================
-- PLANS TABLE
-- ============================================
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

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
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

-- ============================================
-- PAYMENTS TABLE
-- ============================================
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

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_menus_business_id ON menus(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id ON menu_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON menu_items(menu_id, display_order);
CREATE INDEX IF NOT EXISTS idx_screens_business_id ON screens(business_id);
CREATE INDEX IF NOT EXISTS idx_screens_public_token ON screens(public_token);
CREATE INDEX IF NOT EXISTS idx_screens_public_slug ON screens(public_slug);
CREATE INDEX IF NOT EXISTS idx_screen_menu_screen_id ON screen_menu(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_menu_menu_id ON screen_menu(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_schedules_screen_id ON menu_schedules(screen_id);
CREATE INDEX IF NOT EXISTS idx_menu_schedules_menu_id ON menu_schedules(menu_id);
CREATE INDEX IF NOT EXISTS idx_languages_code ON languages(code);
CREATE INDEX IF NOT EXISTS idx_menu_item_translations_item_id ON menu_item_translations(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_translations_lang ON menu_item_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);

-- ============================================
-- FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screens_updated_at BEFORE UPDATE ON screens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_schedules_updated_at BEFORE UPDATE ON menu_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON languages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_item_translations_updated_at BEFORE UPDATE ON menu_item_translations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
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

-- ============================================
-- INITIAL DATA
-- ============================================
-- Insert default languages
INSERT INTO languages (code, name, is_default, is_active) VALUES
    ('en', 'English', true, true),
    ('es', 'Spanish', false, true),
    ('fr', 'French', false, true),
    ('de', 'German', false, true),
    ('it', 'Italian', false, true),
    ('pt', 'Portuguese', false, true)
ON CONFLICT (code) DO NOTHING;

-- Insert default plans (1 ekran = 14.99$, yıllık %15 indirim)
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active) VALUES
    ('basic', '1 Screen', 1, 14.99, 152.90, true),
    ('pro', '5 Screens', 5, 74.95, 764.49, true),
    ('enterprise', 'Enterprise Plan', -1, 149.99, 1529.89, true)
ON CONFLICT (name) DO NOTHING;

-- === templates-schema.sql ===
-- ============================================
-- TEMPLATE SYSTEM SCHEMA
-- ============================================

-- Templates table - Predefined layout templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    block_count INTEGER NOT NULL CHECK (block_count >= 1 AND block_count <= 8),
    preview_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template blocks - Defines block positions for each template
CREATE TABLE IF NOT EXISTS template_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    block_index INTEGER NOT NULL CHECK (block_index >= 0),
    position_x DECIMAL(5, 2) NOT NULL CHECK (position_x >= 0 AND position_x <= 100), -- Percentage
    position_y DECIMAL(5, 2) NOT NULL CHECK (position_y >= 0 AND position_y <= 100), -- Percentage
    width DECIMAL(5, 2) NOT NULL CHECK (width > 0 AND width <= 100), -- Percentage
    height DECIMAL(5, 2) NOT NULL CHECK (height > 0 AND height <= 100), -- Percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, block_index)
);

-- Screen blocks - Links screens to template blocks
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

-- Screen block contents - Content for each block
CREATE TABLE IF NOT EXISTS screen_block_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_block_id UUID NOT NULL REFERENCES screen_blocks(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN (
        'product_list',
        'single_product',
        'image',
        'icon',
        'text',
        'price',
        'campaign_badge'
    )),
    -- Content fields
    image_url TEXT,
    icon_name TEXT, -- Icon identifier (e.g., 'star', 'fire', 'new')
    title TEXT,
    description TEXT,
    price DECIMAL(10, 2),
    campaign_text TEXT, -- For badges: 'NEW', 'HOT', '%50'
    -- Styling
    background_color TEXT,
    background_image_url TEXT,
    text_color TEXT,
    -- Product reference (if content_type is product_list or single_product)
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    menu_id UUID REFERENCES menus(id) ON DELETE SET NULL, -- For product_list
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add template_id to screens table
ALTER TABLE screens ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_block_count ON templates(block_count);
CREATE INDEX IF NOT EXISTS idx_template_blocks_template_id ON template_blocks(template_id);
CREATE INDEX IF NOT EXISTS idx_template_blocks_block_index ON template_blocks(template_id, block_index);
CREATE INDEX IF NOT EXISTS idx_screen_blocks_screen_id ON screen_blocks(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_blocks_template_block_id ON screen_blocks(template_block_id);
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_screen_block_id ON screen_block_contents(screen_block_id);
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_content_type ON screen_block_contents(content_type);
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_menu_item_id ON screen_block_contents(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_menu_id ON screen_block_contents(menu_id);
CREATE INDEX IF NOT EXISTS idx_screens_template_id ON screens(template_id);

-- Triggers
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_blocks_updated_at BEFORE UPDATE ON template_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screen_blocks_updated_at BEFORE UPDATE ON screen_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screen_block_contents_updated_at BEFORE UPDATE ON screen_block_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT DEFAULT TEMPLATES
-- ============================================

-- 1. Single Layout (1 full screen)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('single', 'Single Layout', 'Full screen single block layout', 1, true, true)
ON CONFLICT (name) DO NOTHING;

-- 2. 2 Split Layout (50/50)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('split_2', '2 Split Layout', 'Two equal blocks side by side', 2, true, true)
ON CONFLICT (name) DO NOTHING;

-- 3. 3 Split Layout
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('split_3', '3 Split Layout', 'Three blocks layout', 3, true, true)
ON CONFLICT (name) DO NOTHING;

-- 4. 4 Split Layout (Grid 2x2)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_4', '4 Grid Layout', 'Four blocks in 2x2 grid', 4, true, true)
ON CONFLICT (name) DO NOTHING;

-- 5. 5 Split Layout
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('split_5', '5 Split Layout', 'Five blocks layout', 5, true, true)
ON CONFLICT (name) DO NOTHING;

-- 6. 6 Split Layout (Grid 2x3 or 3x2)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_6', '6 Grid Layout', 'Six blocks in grid layout', 6, true, true)
ON CONFLICT (name) DO NOTHING;

-- 7. 7 Split Layout (Grid 4x2)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_7', '7 Grid Layout', 'Seven blocks in 4x2 grid layout', 7, true, true)
ON CONFLICT (name) DO NOTHING;

-- 8. 8 Split Layout (Grid 4x2)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_8', '8 Grid Layout', 'Eight blocks in 4x2 grid layout', 8, true, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- INSERT TEMPLATE BLOCKS FOR EACH TEMPLATE
-- ============================================

-- Single Layout: 1 full block
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'single';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 100, 100)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 2 Split Layout: 2 blocks side by side (50/50)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'split_2';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 50, 100),
            (v_template_id, 1, 50, 0, 50, 100)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 3 Split Layout: 3 blocks (33.33% each)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'split_3';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 33.33, 100),
            (v_template_id, 1, 33.33, 0, 33.33, 100),
            (v_template_id, 2, 66.66, 0, 33.34, 100)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 4 Grid Layout: 2x2 grid
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_4';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 50, 50),
            (v_template_id, 1, 50, 0, 50, 50),
            (v_template_id, 2, 0, 50, 50, 50),
            (v_template_id, 3, 50, 50, 50, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 5 Split Layout: Custom 5-block layout
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'split_5';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 40, 50),
            (v_template_id, 1, 40, 0, 30, 50),
            (v_template_id, 2, 70, 0, 30, 50),
            (v_template_id, 3, 0, 50, 50, 50),
            (v_template_id, 4, 50, 50, 50, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 6 Grid Layout: 3x2 grid
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_6';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 33.33, 50),
            (v_template_id, 1, 33.33, 0, 33.33, 50),
            (v_template_id, 2, 66.66, 0, 33.34, 50),
            (v_template_id, 3, 0, 50, 33.33, 50),
            (v_template_id, 4, 33.33, 50, 33.33, 50),
            (v_template_id, 5, 66.66, 50, 33.34, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 7 Grid Layout: 4x2 grid (son blok 2 sütun kaplıyor)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_7';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 25, 50),
            (v_template_id, 1, 25, 0, 25, 50),
            (v_template_id, 2, 50, 0, 25, 50),
            (v_template_id, 3, 75, 0, 25, 50),
            (v_template_id, 4, 0, 50, 25, 50),
            (v_template_id, 5, 25, 50, 25, 50),
            (v_template_id, 6, 50, 50, 50, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 8 Grid Layout: 4x2 grid (tüm bloklar eşit)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_8';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 25, 50),
            (v_template_id, 1, 25, 0, 25, 50),
            (v_template_id, 2, 50, 0, 25, 50),
            (v_template_id, 3, 75, 0, 25, 50),
            (v_template_id, 4, 0, 50, 25, 50),
            (v_template_id, 5, 25, 50, 25, 50),
            (v_template_id, 6, 50, 50, 25, 50),
            (v_template_id, 7, 75, 50, 25, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- === template-block-contents-schema.sql ===
-- ============================================
-- TEMPLATE BLOCK CONTENTS SCHEMA
-- Content for template blocks (for template editing)
-- ============================================

-- Template block contents - Content for each template block
CREATE TABLE IF NOT EXISTS template_block_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_block_id UUID NOT NULL REFERENCES template_blocks(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN (
        'product_list',
        'single_product',
        'image',
        'icon',
        'text',
        'price',
        'campaign_badge',
        'drink',
        'regional_menu'
    )),
    -- Content fields
    image_url TEXT,
    icon_name TEXT, -- Icon identifier (e.g., 'star', 'fire', 'new')
    title TEXT,
    description TEXT,
    price DECIMAL(10, 2),
    campaign_text TEXT, -- For badges: 'NEW', 'HOT', '%50'
    -- Styling
    background_color TEXT,
    background_image_url TEXT,
    text_color TEXT,
    style_config JSONB, -- JSON configuration for positioning, sizing, etc.
    -- Product reference (if content_type is product_list or single_product)
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    menu_id UUID REFERENCES menus(id) ON DELETE SET NULL, -- For product_list
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_block_contents_template_block_id ON template_block_contents(template_block_id);
CREATE INDEX IF NOT EXISTS idx_template_block_contents_content_type ON template_block_contents(content_type);
CREATE INDEX IF NOT EXISTS idx_template_block_contents_menu_item_id ON template_block_contents(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_template_block_contents_menu_id ON template_block_contents(menu_id);
CREATE INDEX IF NOT EXISTS idx_template_block_contents_display_order ON template_block_contents(template_block_id, display_order);

-- Trigger for updated_at
CREATE TRIGGER update_template_block_contents_updated_at BEFORE UPDATE ON template_block_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE template_block_contents IS 'Content items for template blocks (used in template editor)';
COMMENT ON COLUMN template_block_contents.template_block_id IS 'Reference to template_block';
COMMENT ON COLUMN template_block_contents.content_type IS 'Type of content: image, icon, text, price, campaign_badge, etc.';
COMMENT ON COLUMN template_block_contents.image_url IS 'Image URL (can be base64 encoded)';
COMMENT ON COLUMN template_block_contents.icon_name IS 'Icon identifier/emoji';
COMMENT ON COLUMN template_block_contents.campaign_text IS 'Text for campaign badges (e.g., "NEW", "HOT", "%50")';

-- === template-editor-schema.sql ===
-- ============================================
-- TEMPLATE EDITOR SCHEMA UPDATES
-- Drag & Drop Editor Support
-- ============================================

-- Add drag & drop fields to screen_blocks table
ALTER TABLE screen_blocks 
  ADD COLUMN IF NOT EXISTS position_x DECIMAL(5, 2) CHECK (position_x >= 0 AND position_x <= 100),
  ADD COLUMN IF NOT EXISTS position_y DECIMAL(5, 2) CHECK (position_y >= 0 AND position_y <= 100),
  ADD COLUMN IF NOT EXISTS width DECIMAL(5, 2) CHECK (width > 0 AND width <= 100),
  ADD COLUMN IF NOT EXISTS height DECIMAL(5, 2) CHECK (height > 0 AND height <= 100),
  ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'fade' CHECK (animation_type IN ('fade', 'slide', 'zoom', 'rotate', 'none')),
  ADD COLUMN IF NOT EXISTS animation_duration INTEGER DEFAULT 500 CHECK (animation_duration >= 100 AND animation_duration <= 5000),
  ADD COLUMN IF NOT EXISTS animation_delay INTEGER DEFAULT 0 CHECK (animation_delay >= 0 AND animation_delay <= 2000),
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_width DECIMAL(5, 2) DEFAULT 10 CHECK (min_width >= 5 AND min_width <= 50),
  ADD COLUMN IF NOT EXISTS min_height DECIMAL(5, 2) DEFAULT 10 CHECK (min_height >= 5 AND min_height <= 50);

-- Initialize position data from template_blocks if not set
UPDATE screen_blocks sb
SET 
  position_x = tb.position_x,
  position_y = tb.position_y,
  width = tb.width,
  height = tb.height
FROM template_blocks tb
WHERE sb.template_block_id = tb.id 
  AND sb.position_x IS NULL;

-- Add index for z_index sorting
CREATE INDEX IF NOT EXISTS idx_screen_blocks_z_index ON screen_blocks(screen_id, z_index);

-- Add index for position queries
CREATE INDEX IF NOT EXISTS idx_screen_blocks_position ON screen_blocks(screen_id, position_x, position_y);

-- Add language support to screen_block_contents
ALTER TABLE screen_block_contents
  ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'en';

-- Create index for language queries
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_language ON screen_block_contents(screen_block_id, language_code);

-- Add undo/redo history table (optional, for advanced features)
CREATE TABLE IF NOT EXISTS screen_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('move', 'resize', 'add', 'delete', 'content', 'animation', 'layer')),
    block_id UUID REFERENCES screen_blocks(id) ON DELETE SET NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screen_edit_history_screen ON screen_edit_history(screen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screen_edit_history_user ON screen_edit_history(user_id, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN screen_blocks.position_x IS 'X position in percentage (0-100) - editable via drag & drop';
COMMENT ON COLUMN screen_blocks.position_y IS 'Y position in percentage (0-100) - editable via drag & drop';
COMMENT ON COLUMN screen_blocks.width IS 'Width in percentage (0-100) - editable via resize';
COMMENT ON COLUMN screen_blocks.height IS 'Height in percentage (0-100) - editable via resize';
COMMENT ON COLUMN screen_blocks.z_index IS 'Layer order - higher values appear on top';
COMMENT ON COLUMN screen_blocks.animation_type IS 'Animation type for this block: fade, slide, zoom, rotate, none';
COMMENT ON COLUMN screen_blocks.animation_duration IS 'Animation duration in milliseconds (100-5000)';
COMMENT ON COLUMN screen_blocks.animation_delay IS 'Animation delay in milliseconds (0-2000)';
COMMENT ON COLUMN screen_blocks.is_locked IS 'If true, block cannot be moved or resized';

-- === text-content-schema.sql ===
-- ============================================
-- TEXT CONTENT ENHANCEMENTS
-- Text position, size, and icon pack support
-- ============================================

-- Add text positioning and sizing fields
ALTER TABLE screen_block_contents
  ADD COLUMN IF NOT EXISTS text_position_x DECIMAL(5, 2) DEFAULT 50 CHECK (text_position_x >= 0 AND text_position_x <= 100),
  ADD COLUMN IF NOT EXISTS text_position_y DECIMAL(5, 2) DEFAULT 50 CHECK (text_position_y >= 0 AND text_position_y <= 100),
  ADD COLUMN IF NOT EXISTS text_size INTEGER DEFAULT 16 CHECK (text_size >= 8 AND text_size <= 200),
  ADD COLUMN IF NOT EXISTS font_weight TEXT DEFAULT 'normal' CHECK (font_weight IN ('normal', 'bold', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'));

-- Add icon pack support (icon_name will store icon identifier from pack)
-- icon_name already exists, we'll use it for icon pack selection

COMMENT ON COLUMN screen_block_contents.text_position_x IS 'Text X position in percentage (0-100) within block';
COMMENT ON COLUMN screen_block_contents.text_position_y IS 'Text Y position in percentage (0-100) within block';
COMMENT ON COLUMN screen_block_contents.text_size IS 'Text font size in pixels (8-200)';
COMMENT ON COLUMN screen_block_contents.font_weight IS 'Text font weight';

-- === template-library-schema.sql ===
-- ============================================
-- TEMPLATE LIBRARY SYSTEM SCHEMA
-- Save, Reuse, and Library System
-- ============================================

-- Update templates table to support user templates
ALTER TABLE templates 
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'system' CHECK (scope IN ('system', 'user')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Update template_blocks to include animation and style config
ALTER TABLE template_blocks
  ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'fade' CHECK (animation_type IN ('fade', 'slide', 'zoom', 'rotate', 'none')),
  ADD COLUMN IF NOT EXISTS animation_duration INTEGER DEFAULT 500 CHECK (animation_duration >= 100 AND animation_duration <= 5000),
  ADD COLUMN IF NOT EXISTS animation_delay INTEGER DEFAULT 0 CHECK (animation_delay >= 0 AND animation_delay <= 2000),
  ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT '{}'::jsonb;

-- Indexes for template library queries
CREATE INDEX IF NOT EXISTS idx_templates_scope ON templates(scope);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_business_id ON templates(business_id);
CREATE INDEX IF NOT EXISTS idx_templates_scope_business ON templates(scope, business_id) WHERE scope = 'user';

-- Update existing system templates to have scope = 'system'
UPDATE templates SET scope = 'system' WHERE is_system = true AND (scope IS NULL OR scope != 'system');

-- Function to duplicate a template
CREATE OR REPLACE FUNCTION duplicate_template(
  source_template_id UUID,
  new_name TEXT,
  new_display_name TEXT,
  new_created_by UUID,
  new_business_id UUID
) RETURNS UUID AS $$
DECLARE
  new_template_id UUID;
BEGIN
  -- Create new template
  INSERT INTO templates (
    name,
    display_name,
    description,
    block_count,
    preview_image_url,
    is_active,
    is_system,
    scope,
    created_by,
    business_id
  )
  SELECT
    new_name,
    new_display_name,
    description,
    block_count,
    preview_image_url,
    is_active,
    false, -- Duplicated templates are never system templates
    'user', -- Duplicated templates are user templates
    new_created_by,
    new_business_id
  FROM templates
  WHERE id = source_template_id
  RETURNING id INTO new_template_id;

  -- Copy template blocks
  INSERT INTO template_blocks (
    template_id,
    block_index,
    position_x,
    position_y,
    width,
    height,
    z_index,
    animation_type,
    animation_duration,
    animation_delay,
    style_config
  )
  SELECT
    new_template_id,
    block_index,
    position_x,
    position_y,
    width,
    height,
    COALESCE(z_index, 0),
    COALESCE(animation_type, 'fade'),
    COALESCE(animation_duration, 500),
    COALESCE(animation_delay, 0),
    COALESCE(style_config, '{}'::jsonb)
  FROM template_blocks
  WHERE template_id = source_template_id;

  RETURN new_template_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN templates.scope IS 'Template scope: system (platform-defined) or user (user-created)';
COMMENT ON COLUMN templates.created_by IS 'User who created this template (NULL for system templates)';
COMMENT ON COLUMN templates.business_id IS 'Business that owns this template (for user templates)';
COMMENT ON COLUMN template_blocks.z_index IS 'Layer order for blocks';
COMMENT ON COLUMN template_blocks.animation_type IS 'Animation type for block';
COMMENT ON COLUMN template_blocks.animation_duration IS 'Animation duration in milliseconds';
COMMENT ON COLUMN template_blocks.animation_delay IS 'Animation delay in milliseconds';
COMMENT ON COLUMN template_blocks.style_config IS 'JSON configuration for block styles (colors, fonts, etc.)';

-- === migration-create-content-library.sql ===
-- Migration: Create content_library table for managing library images

CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('image', 'icon', 'background', 'drink', 'text')),
  url TEXT,
  content TEXT, -- For emoji icons
  icon VARCHAR(50), -- Category icon
  gradient TEXT, -- For gradient backgrounds
  color VARCHAR(20), -- For solid color backgrounds
  template VARCHAR(50), -- For text templates
  sample TEXT, -- Sample text for text templates
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster category queries
CREATE INDEX IF NOT EXISTS idx_content_library_category ON content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON content_library(type);
CREATE INDEX IF NOT EXISTS idx_content_library_active ON content_library(is_active);

-- Add comment
COMMENT ON TABLE content_library IS 'Content library for images, icons, backgrounds, drinks, and text templates';
COMMENT ON COLUMN content_library.category IS 'Category name (food, drinks, icons, backgrounds, text)';
COMMENT ON COLUMN content_library.type IS 'Content type (image, icon, background, drink, text)';
COMMENT ON COLUMN content_library.url IS 'Image URL (can be external URL or base64)';
COMMENT ON COLUMN content_library.content IS 'Emoji or text content for icons';

-- === migration-content-library-categories.sql ===
-- Migration: content_library_categories - Admin tarafından düzenlenebilir kategoriler

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

CREATE INDEX IF NOT EXISTS idx_content_library_categories_order ON content_library_categories(display_order);

-- Mevcut kategorileri ekle
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('food', 'Yiyecekler', '🍕', 0),
  ('pasta', 'Makarnalar', '🍝', 1),
  ('drinks', 'İçecekler', '🍹', 2),
  ('icons', 'İkonlar', '🎨', 3),
  ('badges', 'Rozetler', '🏷️', 4),
  ('backgrounds', 'Arka Planlar', '🖼️', 5),
  ('text', 'Metin Şablonları', '📝', 6)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE content_library_categories IS 'Admin tarafından düzenlenebilir içerik kütüphanesi kategori tanımları';

-- === migration-add-7-8-templates.sql ===
-- ============================================
-- MIGRATION: Add 7 and 8 block templates
-- ============================================

-- 1. Update CHECK constraint to allow up to 8 blocks
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_block_count_check;
ALTER TABLE templates ADD CONSTRAINT templates_block_count_check CHECK (block_count >= 1 AND block_count <= 8);

-- 2. Insert 7 and 8 block templates
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active) VALUES
    ('grid_7', '7 Grid Layout', 'Seven blocks in 4x2 grid layout', 7, true, true),
    ('grid_8', '8 Grid Layout', 'Eight blocks in 4x2 grid layout', 8, true, true)
ON CONFLICT (name) DO NOTHING;

-- 3. Insert template blocks for 7 Grid Layout (4x2 grid, last block spans 2 columns)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_7';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 25, 50),
            (v_template_id, 1, 25, 0, 25, 50),
            (v_template_id, 2, 50, 0, 25, 50),
            (v_template_id, 3, 75, 0, 25, 50),
            (v_template_id, 4, 0, 50, 25, 50),
            (v_template_id, 5, 25, 50, 25, 50),
            (v_template_id, 6, 50, 50, 50, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- 4. Insert template blocks for 8 Grid Layout (4x2 grid, all blocks equal)
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM templates WHERE name = 'grid_8';
    IF v_template_id IS NOT NULL THEN
        INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height) VALUES
            (v_template_id, 0, 0, 0, 25, 50),
            (v_template_id, 1, 25, 0, 25, 50),
            (v_template_id, 2, 50, 0, 25, 50),
            (v_template_id, 3, 75, 0, 25, 50),
            (v_template_id, 4, 0, 50, 25, 50),
            (v_template_id, 5, 25, 50, 25, 50),
            (v_template_id, 6, 50, 50, 25, 50),
            (v_template_id, 7, 75, 50, 25, 50)
        ON CONFLICT (template_id, block_index) DO NOTHING;
    END IF;
END $$;

-- === migration-add-admin-activity-log.sql ===
-- Admin hareket günlüğü: Hangi kullanıcı hangi sayfada ne işlem yaptı (tarih aralığı ile raporlanabilir)
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(80) NOT NULL,
  page_key VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80),
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_user_id ON admin_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_page_key ON admin_activity_log(page_key);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action_type ON admin_activity_log(action_type);

COMMENT ON TABLE admin_activity_log IS 'Admin/super_admin kullanıcı hareketleri: sayfa, işlem tipi, tarih (raporlama için)';

-- === migration-add-admin-role-and-permissions.sql ===
-- Admin rolü ve yetki tablosu: Super admin, admin kullanıcı oluşturabilsin; admin sayfalara yetki ile erişsin

-- 1) users.role CHECK'e 'admin' ekle (varsa güncelle)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('super_admin', 'admin', 'business_user'));
  END IF;
END $$;

-- 2) Admin yetkileri: hangi sayfada ne yetkisi var (view / edit / full)
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR(80) NOT NULL,
  permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'full')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_page_key ON admin_permissions(page_key);

COMMENT ON TABLE admin_permissions IS 'Admin kullanıcıların sayfa bazlı yetkileri (view=görüntüle, edit=düzenle, full=tam)';

-- === migration-add-admin-permission-actions.sql ===
-- Detaylı yetkiler: her sayfa için aksiyon bazlı yetki (resim ekleme, kategori açma vb.)
ALTER TABLE admin_permissions
  ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '{}';

COMMENT ON COLUMN admin_permissions.actions IS 'Sayfa bazlı detay yetkileri, örn. library: { "image_add": true, "category_create": true }';

-- === migration-add-reference-number.sql ===
-- Referans numarası: her kullanıcıya 00001, 00002... atanır; referans ile gelenler referred_by_user_id ile işaretlenir.
-- Eski kayıtlar korunur, mevcut business_user'lara created_at sırasına göre numara verilir.

-- Sütunlar
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reference_number ON users (reference_number) WHERE reference_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users (referred_by_user_id) WHERE referred_by_user_id IS NOT NULL;

-- Sıra numarası için sequence (yeni kayıtlar için)
CREATE SEQUENCE IF NOT EXISTS user_reference_seq;

-- Mevcut business_user'lara created_at sırasıyla 00001, 00002... ata (henüz atanmamış olanlara; mevcut numaraları ezmez)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users
  WHERE role = 'business_user' AND (reference_number IS NULL OR reference_number = '')
),
max_ref AS (
  SELECT COALESCE(MAX(CAST(reference_number AS INTEGER)), 0)::int AS m FROM users WHERE reference_number ~ '^\\d+$'
)
UPDATE users u
SET reference_number = LPAD((m.m + o.rn)::text, 5, '0')
FROM ordered o, max_ref m
WHERE u.id = o.id;

-- Sequence'i mevcut max + 1 yap (yeni kayıtlar doğru numarayı alsın)
SELECT setval(
  'user_reference_seq',
  COALESCE((SELECT MAX(CAST(reference_number AS INTEGER)) FROM users WHERE reference_number ~ '^\\d+$'), 0) + 1
);

-- === migration-add-admin-reference-number.sql ===
-- Admin referans numarası: admin ve super_admin kullanıcılara ADM-00001, ADM-00002... atanır.
-- business_user referansları (00001, 00002) ile karışmaz.

CREATE SEQUENCE IF NOT EXISTS admin_reference_seq;

-- Mevcut max ADM numarası (varsa)
WITH max_adm AS (
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)), 0)::int AS m
  FROM users
  WHERE reference_number ~ '^ADM-\\d+$'
),
-- Numarası olmayan admin/super_admin'leri created_at sırasına göre listele
ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users
  WHERE role IN ('admin', 'super_admin')
    AND (reference_number IS NULL OR reference_number = '' OR reference_number !~ '^ADM-\\d+$')
)
UPDATE users u
SET reference_number = 'ADM-' || LPAD((m.m + o.rn)::text, 5, '0')
FROM ordered o, max_adm m
WHERE u.id = o.id;

-- Sequence'i mevcut max + 1 yap (yeni admin kayıtları doğru numarayı alsın)
SELECT setval(
  'admin_reference_seq',
  COALESCE((
    SELECT MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER))
    FROM users
    WHERE reference_number ~ '^ADM-\\d+$'
  ), 0) + 1
);

-- === migration-add-alcoholic-drinks-glasses.sql ===
-- İçecek kategorisine alkollü içkiler ekle: kokteyl, viski, votka, tekila, vb. (bardakta)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Whisky', 'drinks', 'drink', 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=90', 350),
  ('Whiskey on the Rocks', 'drinks', 'drink', 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&q=90', 351),
  ('Vodka', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=90', 352),
  ('Tequila', 'drinks', 'drink', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=90', 353),
  ('Rum', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', 354),
  ('Gin', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=90', 355),
  ('Martini', 'drinks', 'drink', 'https://images.unsplash.com/photo-1575023782549-62c0e1270490?w=800&q=90', 356),
  ('Margarita', 'drinks', 'drink', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=90', 357),
  ('Old Fashioned', 'drinks', 'drink', 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=90', 358),
  ('Negroni', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', 359),
  ('Aperol Spritz', 'drinks', 'drink', 'https://images.unsplash.com/photo-1575023782549-62c0e1270490?w=800&q=90', 360),
  ('Champagne', 'drinks', 'drink', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=90', 361),
  ('Wine Glass', 'drinks', 'drink', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=90', 362),
  ('Mojito', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=90', 363),
  ('Cocktail', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', 364),
  ('Bloody Mary', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=90', 365),
  ('Piña Colada', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', 366),
  ('Beer Glass', 'drinks', 'drink', 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=90', 367),
  ('Sangria', 'drinks', 'drink', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=90', 368),
  ('Espresso Martini', 'drinks', 'drink', 'https://images.unsplash.com/photo-1575023782549-62c0e1270490?w=800&q=90', 369);

-- === migration-add-canvas-design-to-templates.sql ===
-- Add canvas_design column for templates created from CanvasDesignEditor
-- When set, template uses Konva shapes (text, image, video, imageRotation) + backgroundColor + layoutType
ALTER TABLE templates ADD COLUMN IF NOT EXISTS canvas_design JSONB;

COMMENT ON COLUMN templates.canvas_design IS 'Canvas editor design data: { shapes, backgroundColor, layoutType } - used when template created from /editor';

-- === migration-add-desserts-category.sql ===
-- Add Desserts category
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('desserts', 'Tatlılar', '🍰', 7)
ON CONFLICT (slug) DO NOTHING;

-- === migration-add-display-frame-ticker.sql ===
-- Add frame_type and ticker_text to screens table for TV display
-- frame_type: none | frame_1 .. frame_10 (10 modern frame models)
-- ticker_text: scrolling text line at bottom (no frame at bottom)

ALTER TABLE screens ADD COLUMN IF NOT EXISTS frame_type TEXT DEFAULT 'none';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ticker_text TEXT DEFAULT '';

COMMENT ON COLUMN screens.frame_type IS 'TV display frame: none, frame_1..frame_10';
COMMENT ON COLUMN screens.ticker_text IS 'Scrolling ticker text at bottom of TV display';

-- === migration-add-template-rotation.sql ===
-- Migration: Add Template Rotation System
-- Allows multiple templates to be scheduled for a screen with display durations

CREATE TABLE IF NOT EXISTS screen_template_rotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    display_duration INTEGER NOT NULL DEFAULT 5, -- seconds
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(screen_id, template_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_screen_id ON screen_template_rotations(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_template_id ON screen_template_rotations(template_id);
CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_active ON screen_template_rotations(screen_id, is_active, display_order);

CREATE TRIGGER update_screen_template_rotations_updated_at BEFORE UPDATE ON screen_template_rotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- === migration-add-display-scale-indexes.sql ===
-- Migration: Display scale indexes (1000+ TVs)
-- Run after base schema. Optimizes /public/screen/:token queries.
-- Idempotent: safe to run multiple times.

CREATE INDEX IF NOT EXISTS idx_screens_public_slug_active
  ON screens(public_slug) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_screens_public_token_active
  ON screens(public_token) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_screen_active
  ON screen_template_rotations(screen_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_template_block_contents_block_active
  ON template_block_contents(template_block_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_screen_block_contents_block_active
  ON screen_block_contents(screen_block_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_menu_items_menu_display
  ON menu_items(menu_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_menu_item_translations_item_lang
  ON menu_item_translations(menu_item_id, language_code);

-- === migration-add-drink-content-type.sql ===
-- Migration: Add 'drink' content type and style_config column to template_block_contents

-- First, drop the existing CHECK constraint
ALTER TABLE template_block_contents 
DROP CONSTRAINT IF EXISTS template_block_contents_content_type_check;

-- Add the new CHECK constraint with 'drink' included
ALTER TABLE template_block_contents 
ADD CONSTRAINT template_block_contents_content_type_check 
CHECK (content_type IN (
    'product_list',
    'single_product',
    'image',
    'icon',
    'text',
    'price',
    'campaign_badge',
    'drink'
));

-- Add style_config column if it doesn't exist
ALTER TABLE template_block_contents 
ADD COLUMN IF NOT EXISTS style_config JSONB;

-- Add comment
COMMENT ON COLUMN template_block_contents.style_config IS 'JSON configuration for positioning, sizing, and other style settings';

-- === migration-add-invoice-number.sql ===
-- Fatura sistemi: payments tablosuna fatura numarası
-- Format: INV-YYYY-NNNNN (ör. INV-2025-00001)

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

-- Mevcut ödemelere yıl bazlı sıralı fatura numarası ver
WITH ordered AS (
  SELECT id, payment_date,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM payment_date::timestamp) ORDER BY payment_date, id) AS rn
  FROM payments WHERE invoice_number IS NULL
)
UPDATE payments p SET invoice_number = 'INV-' || TO_CHAR(p.payment_date::timestamp, 'YYYY') || '-' || LPAD(o.rn::text, 5, '0')
FROM ordered o WHERE p.id = o.id;

-- Yeni ödemeler için NOT NULL yapma (webhook INSERT'ta set edeceğiz); boş kalan varsa yukarıdaki blok sonrası dolu olur
-- Opsiyonel: ALTER TABLE payments ALTER COLUMN invoice_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_invoice_number ON payments (invoice_number) WHERE invoice_number IS NOT NULL;

-- === migration-add-preferred-locale.sql ===
-- Kullanıcı dil tercihi (sayfa başlangıç dili en; kullanıcı değiştirdiğinde saklanır)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en' CHECK (preferred_locale IN ('en', 'tr', 'fr'));

UPDATE users SET preferred_locale = 'en' WHERE preferred_locale IS NULL;

-- === migration-add-public-slug.sql ===
-- Migration: Add public_slug column to screens table
-- This migration adds a slug column for readable URLs like /display/metro-pizzatv3

-- Add public_slug column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'screens' AND column_name = 'public_slug'
    ) THEN
        ALTER TABLE screens ADD COLUMN public_slug TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_screens_public_slug ON screens(public_slug);
    END IF;
END $$;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name_text TEXT) RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    turkish_map JSONB := '{"ç":"c","Ç":"c","ğ":"g","Ğ":"g","ı":"i","İ":"i","ö":"o","Ö":"o","ş":"s","Ş":"s","ü":"u","Ü":"u"}'::JSONB;
    char TEXT;
    result TEXT := '';
    i INT;
BEGIN
    -- Convert Turkish characters
    FOR i IN 1..length(name_text) LOOP
        char := substring(name_text FROM i FOR 1);
        IF turkish_map ? char THEN
            result := result || turkish_map->>char;
        ELSE
            result := result || char;
        END IF;
    END LOOP;
    
    -- Convert to lowercase, remove special chars, replace spaces with hyphens
    slug := lower(result);
    slug := regexp_replace(slug, '[^a-z0-9\\s-]', '', 'g');
    slug := regexp_replace(slug, '\\s+', ' ', 'g');
    slug := replace(slug, ' ', '-');
    slug := regexp_replace(slug, '-+', '-', 'g');
    slug := trim(both '-' from slug);
    
    -- If empty, generate default
    IF slug = '' OR slug IS NULL THEN
        slug := 'screen-' || to_hex(extract(epoch from now())::bigint);
    END IF;
    
    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing screens that don't have one
DO $$
DECLARE
    screen_record RECORD;
    new_slug TEXT;
    counter INT;
    final_slug TEXT;
BEGIN
    FOR screen_record IN SELECT id, name FROM screens WHERE public_slug IS NULL OR public_slug = '' LOOP
        new_slug := generate_slug(screen_record.name);
        final_slug := new_slug;
        counter := 1;
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM screens WHERE public_slug = final_slug AND id != screen_record.id) LOOP
            final_slug := new_slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        UPDATE screens SET public_slug = final_slug WHERE id = screen_record.id;
    END LOOP;
END $$;

-- === migration-add-qr-background-to-businesses.sql ===
-- Migration: Add QR page background fields to businesses table
-- Lets users set a background image and color for the public QR menu page.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'qr_background_image_url'
    ) THEN
        ALTER TABLE businesses ADD COLUMN qr_background_image_url TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'qr_background_color'
    ) THEN
        ALTER TABLE businesses ADD COLUMN qr_background_color VARCHAR(32);
    END IF;
END $$;

-- === migration-add-regional-category.sql ===
-- Yöresel Tek Menü kategorisini admin kütüphanesine ekle
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('regional', 'Yöresel Tek Menü', '🍽️', 7)
ON CONFLICT (slug) DO NOTHING;

-- === migration-add-regional-menu-content-type.sql ===
-- Migration: Add 'regional_menu' content type to template_block_contents

-- Drop the existing CHECK constraint
ALTER TABLE template_block_contents 
DROP CONSTRAINT IF EXISTS template_block_contents_content_type_check;

-- Add the new CHECK constraint with 'regional_menu' included
ALTER TABLE template_block_contents 
ADD CONSTRAINT template_block_contents_content_type_check 
CHECK (content_type IN (
    'product_list',
    'single_product',
    'image',
    'icon',
    'text',
    'price',
    'campaign_badge',
    'drink',
    'regional_menu'
));

-- === migration-add-rotation-transition-effect.sql ===
-- Her template için ayrı geçiş efekti (screen_template_rotations)
ALTER TABLE screen_template_rotations
ADD COLUMN IF NOT EXISTS transition_effect TEXT DEFAULT 'fade'
CHECK (transition_effect IN (
  'fade', 'slide-left', 'slide-right', 'zoom', 'flip', 'car-pull', 'curtain', 'wipe'
));

COMMENT ON COLUMN screen_template_rotations.transition_effect IS 'Bu templatee geçerken kullanılacak efekt';

-- === migration-add-template-transition-effect.sql ===
-- Template geçiş efekti: şablon değişiminde kullanılacak efekt (fade, slide-left, car-pull, curtain, flip, zoom, wipe)
ALTER TABLE screens
ADD COLUMN IF NOT EXISTS template_transition_effect TEXT DEFAULT 'fade'
CHECK (template_transition_effect IN (
  'fade', 'slide-left', 'slide-right', 'zoom', 'flip', 'car-pull', 'curtain', 'wipe'
));

COMMENT ON COLUMN screens.template_transition_effect IS 'Template rotation geçiş efekti: fade, slide-left, slide-right, zoom, flip, car-pull, curtain, wipe';

-- === migration-add-ticker-style.sql ===
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ticker_style TEXT DEFAULT 'default';

-- === migration-add-uploaded-by-to-content-library.sql ===
-- Kullanıcı yüklemelerini takip etmek için uploaded_by kolonu
ALTER TABLE content_library 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_library_uploaded_by ON content_library(uploaded_by);

COMMENT ON COLUMN content_library.uploaded_by IS 'Bu içeriği yükleyen kullanıcı (NULL = admin/sistem)';

-- === migration-add-video-content-type.sql ===
-- Migration: Add 'video' content type to template_block_contents

ALTER TABLE template_block_contents 
DROP CONSTRAINT IF EXISTS template_block_contents_content_type_check;

ALTER TABLE template_block_contents 
ADD CONSTRAINT template_block_contents_content_type_check 
CHECK (content_type IN (
    'product_list',
    'single_product',
    'image',
    'icon',
    'text',
    'price',
    'campaign_badge',
    'drink',
    'regional_menu',
    'video'
));

-- === migration-add-video-to-screen-block-contents.sql ===
-- Migration: Add 'video' content type to screen_block_contents

ALTER TABLE screen_block_contents 
DROP CONSTRAINT IF EXISTS screen_block_contents_content_type_check;

ALTER TABLE screen_block_contents 
ADD CONSTRAINT screen_block_contents_content_type_check 
CHECK (content_type IN (
    'product_list',
    'single_product',
    'image',
    'icon',
    'text',
    'price',
    'campaign_badge',
    'drink',
    'regional_menu',
    'video'
));

-- === migration-add-video-type-to-content-library.sql ===
-- Migration: Add 'video' type to content_library CHECK constraint
-- The original table has: CHECK (type IN ('image', 'icon', 'background', 'drink', 'text'))
-- We need to add 'video'

ALTER TABLE content_library DROP CONSTRAINT IF EXISTS content_library_type_check;

ALTER TABLE content_library ADD CONSTRAINT content_library_type_check
  CHECK (type IN ('image', 'icon', 'background', 'drink', 'text', 'video'));

-- === migration-clean-content-library-duplicates.sql ===
-- Aynı olan kayıtları temizle: aynı resim (url) veya aynı isim+kategori+tür tek kalsın.

-- 1) Resimler: Aynı url'ye sahip birden fazla kayıt varsa, id'si en küçük olanı bırak, diğerlerini sil
DELETE FROM content_library
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY url ORDER BY id) AS rn
    FROM content_library
    WHERE type = 'image' AND url IS NOT NULL AND url != ''
  ) t
  WHERE t.rn > 1
);

-- 2) Resim/icon vb: Aynı name+category+type birden fazla varsa 1 kalsın.
--    Video: url farklı olduğu sürece aynı isimle birden fazla olabilir; sadece name+category+type+url aynı olanları temizle
DELETE FROM content_library
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY 
               name, category, type,
               CASE WHEN type = 'video' THEN COALESCE(url, '') ELSE '' END
             ORDER BY id
           ) AS rn
    FROM content_library
  ) t
  WHERE t.rn > 1
);

-- === migration-clean-content-library-duplicates-v2.sql ===
-- Aynı isim + aynı resim (url) olan kayıtlardan fazlalıkları sil, her birinden 1 adet kalsın.

DELETE FROM content_library
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY 
               COALESCE(TRIM(name), ''),
               COALESCE(NULLIF(TRIM(url), ''), '(empty)')
             ORDER BY id
           ) AS rn
    FROM content_library
  ) t
  WHERE t.rn > 1
);

-- === migration-content-library-english-canadian-drinks.sql ===
-- Migration: English product names, Canadian cuisine category with rich images, and full drinks (cold, hot, alcoholic)

-- 1) Add Canadian Cuisine category if not exists
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('canadian', 'Canadian Cuisine', '🍁', 7)
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon;

-- 2) Canadian food items – one rich image per dish (category: canadian)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Poutine', 'canadian', 'image', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=85', 1),
  ('Maple Glazed Salmon', 'canadian', 'image', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=85', 2),
  ('Butter Tarts', 'canadian', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=85', 3),
  ('Tourtière', 'canadian', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', 4),
  ('Nanaimo Bars', 'canadian', 'image', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=85', 5),
  ('Beaver Tails', 'canadian', 'image', 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=85', 6),
  ('Montreal Smoked Meat', 'canadian', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=85', 7),
  ('Bannock', 'canadian', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=85', 8),
  ('Pea Soup', 'canadian', 'image', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=85', 9),
  ('Canadian Bacon', 'canadian', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', 10);

-- 3) Drinks – cold, hot, alcoholic (English names, rich images)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Cola', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=85', 200),
  ('Lemonade', 'drinks', 'drink', 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=800&q=85', 201),
  ('Orange Juice', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=85', 202),
  ('Iced Tea', 'drinks', 'drink', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=85', 203),
  ('Iced Coffee', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=85', 204),
  ('Sparkling Water', 'drinks', 'drink', 'https://images.unsplash.com/photo-1548839140-5a941f94e0ea?w=800&q=85', 205),
  ('Beer', 'drinks', 'drink', 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=85', 206),
  ('Wine', 'drinks', 'drink', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=85', 207),
  ('Caesar Cocktail', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=85', 208),
  ('Mojito', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=85', 209),
  ('Craft Beer', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=85', 210),
  ('Espresso', 'drinks', 'drink', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=85', 211),
  ('Cappuccino', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=85', 212),
  ('Latte', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=85', 213),
  ('Tea', 'drinks', 'drink', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=85', 214),
  ('Hot Chocolate', 'drinks', 'drink', 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=800&q=85', 215);

-- 4) Update common Turkish names to English (by exact name match)
UPDATE content_library SET name = 'Classic Burger' WHERE name = 'Klasik Burger';
UPDATE content_library SET name = 'Fried Chicken' WHERE name = 'Kızarmış Tavuk';
UPDATE content_library SET name = 'Chicken Wings' WHERE name = 'Tavuk Kanat';
UPDATE content_library SET name = 'Spaghetti' WHERE name = 'Spagetti';
UPDATE content_library SET name = 'Kebab' WHERE name = 'Kebap';
UPDATE content_library SET name = 'Adana Kebab' WHERE name = 'Adana Kebap';
UPDATE content_library SET name = 'Urfa Kebab' WHERE name = 'Urfa Kebap';
UPDATE content_library SET name = 'Doner' WHERE name = 'Döner';
UPDATE content_library SET name = 'Iskender' WHERE name = 'İskender';
UPDATE content_library SET name = 'Cig Kofte' WHERE name = 'Çiğ Köfte';
UPDATE content_library SET name = 'Borek' WHERE name = 'Börek';
UPDATE content_library SET name = 'Gozleme' WHERE name = 'Gözleme';
UPDATE content_library SET name = 'Cola' WHERE name = 'Kola';
UPDATE content_library SET name = 'Lemonade' WHERE name = 'Limonata';
UPDATE content_library SET name = 'Orange Juice' WHERE name = 'Portakal Suyu';
UPDATE content_library SET name = 'Iced Tea' WHERE name = 'Buzlu Çay';
UPDATE content_library SET name = 'Tea' WHERE name = 'Çay';
UPDATE content_library SET name = 'Hot Chocolate' WHERE name = 'Sıcak Çikolata';
UPDATE content_library SET name = 'Chocolate Cake' WHERE name = 'Çikolatalı Pasta';
UPDATE content_library SET name = 'Ice Cream' WHERE name = 'Dondurma';
UPDATE content_library SET name = 'Pancakes' WHERE name = 'Pankek';
UPDATE content_library SET name = 'Cookies' WHERE name = 'Kurabiye';
UPDATE content_library SET name = 'Profiterole' WHERE name = 'Profiterol';
UPDATE content_library SET name = 'Beaver Tails' WHERE name = 'BeaverTails';

-- === migration-display-viewers.sql ===
-- Aynı ekran linkinin kaç cihazda açık olduğunu tespit için viewer heartbeat kayıtları
-- session_id: tarayıcı/cihaz başına benzersiz (frontend sessionStorage'dan gelir)

CREATE TABLE IF NOT EXISTS display_viewers (
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (screen_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_display_viewers_last_seen ON display_viewers(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_display_viewers_screen_id ON display_viewers(screen_id);

COMMENT ON TABLE display_viewers IS 'Display sayfası heartbeat ile gelen oturumlar; aynı linkin birden fazla cihazda açık olup olmadığı tespit edilir';

-- === migration-display-viewers-first-seen.sql ===
-- İlk açan oturum yayına izinli; diğerleri blok için first_seen_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'display_viewers' AND column_name = 'first_seen_at') THEN
    ALTER TABLE display_viewers ADD COLUMN first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE display_viewers SET first_seen_at = last_seen_at;
  END IF;
END $$;

COMMENT ON COLUMN display_viewers.first_seen_at IS 'İlk heartbeat zamanı; en eski oturum yayına izinli sayılır';

-- === migration-enrich-content-library-images.sql ===
-- Migration: Enrich content library with rich, diverse images across all categories

-- Food – main dishes, burgers, salads, breakfast (rich visuals)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Grilled Steak', 'food', 'image', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=90', 500),
  ('BBQ Ribs', 'food', 'image', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=90', 501),
  ('Fish Tacos', 'food', 'image', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=90', 502),
  ('Avocado Toast', 'food', 'image', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=90', 503),
  ('Eggs Benedict', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', 504),
  ('Shrimp Bowl', 'food', 'image', 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=90', 505),
  ('Grilled Salmon', 'food', 'image', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=90', 506),
  ('Caesar Wrap', 'food', 'image', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=90', 507),
  ('Falafel Plate', 'food', 'image', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&q=90', 508),
  ('Sushi Platter', 'food', 'image', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=90', 509),
  ('Ramen Bowl', 'food', 'image', 'https://images.unsplash.com/photo-1569718212165-3a2858982b79?w=800&q=90', 510),
  ('Taco Feast', 'food', 'image', 'https://images.unsplash.com/photo-1565299585323-38174c3d3b0c?w=800&q=90', 511),
  ('Mediterranean Plate', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=90', 512),
  ('Buddha Bowl', 'food', 'image', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=90', 513),
  ('Grilled Chicken', 'food', 'image', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=90', 514);

-- Pasta – varied pasta dishes with distinct images
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Spaghetti Bolognese', 'pasta', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=90', 600),
  ('Penne Vodka', 'pasta', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=90', 601),
  ('Lobster Linguine', 'pasta', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=90', 602),
  ('Mushroom Risotto', 'pasta', 'image', 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=90', 603),
  ('Cacio e Pepe', 'pasta', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=90', 604),
  ('Stuffed Shells', 'pasta', 'image', 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&q=90', 605),
  ('Pesto Pasta', 'pasta', 'image', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=90', 606),
  ('Tomato Basil Pasta', 'pasta', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=90', 607);

-- Drinks – cold, hot, cocktails (rich visuals)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Fresh Smoothie Bowl', 'drinks', 'drink', 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=90', 300),
  ('Matcha Latte', 'drinks', 'drink', 'https://images.unsplash.com/photo-1536256264052-4d01d838c98a?w=800&q=90', 301),
  ('Fresh Juice', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=90', 302),
  ('Craft Cocktail', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', 303),
  ('Iced Matcha', 'drinks', 'drink', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=90', 304),
  ('Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=90', 305),
  ('Espresso Shot', 'drinks', 'drink', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=90', 306),
  ('Herbal Tea', 'drinks', 'drink', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=90', 307),
  ('Sparkling Lemonade', 'drinks', 'drink', 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=800&q=90', 308),
  ('Cold Brew', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=90', 309);

-- Desserts – cakes, pastries, ice cream (rich visuals)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Chocolate Cake', 'desserts', 'image', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=90', 700),
  ('New York Cheesecake', 'desserts', 'image', 'https://images.unsplash.com/photo-1533134242820-b4f3f2d8f7b3?w=800&q=90', 701),
  ('Gelato', 'desserts', 'image', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=90', 702),
  ('Croissant', 'desserts', 'image', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=90', 703),
  ('Fruit Tart', 'desserts', 'image', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=90', 704),
  ('Panna Cotta', 'desserts', 'image', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=90', 705),
  ('Cinnamon Roll', 'desserts', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=90', 706),
  ('Macarons', 'desserts', 'image', 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&q=90', 707),
  ('Chocolate Mousse', 'desserts', 'image', 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&q=90', 708),
  ('Berry Parfait', 'desserts', 'image', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=90', 709);

-- Backgrounds – HD food & ambiance (for templates)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Coffee Shop Ambiance', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=90', 100),
  ('Restaurant Table', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=90', 101),
  ('Fresh Ingredients', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1920&q=90', 102),
  ('Gourmet Plating', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=90', 103),
  ('Bar Counter', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1920&q=90', 104),
  ('Bakery Style', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=90', 105),
  ('Outdoor Dining', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=90', 106),
  ('Minimal Dark', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=90', 107);

-- Canadian – extra Canadian dishes with rich images
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Classic Poutine', 'canadian', 'image', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=90', 20),
  ('Saskatoon Berry Pie', 'canadian', 'image', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=90', 21),
  ('Cod au Gratin', 'canadian', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=90', 22);

-- === migration-enrich-food-soups-fish-doner-breakfast.sql ===
-- Yiyecekler: çorbalar, balıklar, dönerler, kahvaltı çeşitleri (gerçek yemek görselleri, boş görsel yok)

-- Çorbalar
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Mercimek Çorbası', 'food', 'image', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=90', 520),
  ('Ezogelin Çorba', 'food', 'image', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=90', 521),
  ('Tarhana Çorbası', 'food', 'image', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=90', 522),
  ('Yayla Çorbası', 'food', 'image', 'https://images.unsplash.com/photo-1603105037880-880cd4edf0d0?w=800&q=90', 523),
  ('Tavuk Suyu Çorba', 'food', 'image', 'https://images.unsplash.com/photo-1603105037880-880cd4edf0d0?w=800&q=90', 524),
  ('Domates Çorbası', 'food', 'image', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=90', 525),
  ('Balık Çorbası', 'food', 'image', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=90', 526),
  ('İşkembe Çorbası', 'food', 'image', 'https://images.unsplash.com/photo-1603105037880-880cd4edf0d0?w=800&q=90', 527),
  ('Kelle Paça', 'food', 'image', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=90', 528);

-- Balıklar
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Izgara Somon', 'food', 'image', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=90', 530),
  ('Levrek', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=90', 531),
  ('Çupra', 'food', 'image', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=90', 532),
  ('Karides', 'food', 'image', 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=90', 533),
  ('Kalamar', 'food', 'image', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=90', 534),
  ('Fish & Chips', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=90', 535),
  ('Somon Fileto', 'food', 'image', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=90', 536),
  ('Balık Buğulama', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=90', 537),
  ('Karides Güveç', 'food', 'image', 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=90', 538);

-- Dönerler / Kebap / Pide
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Döner', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=90', 540),
  ('İskender', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', 541),
  ('Adana Kebap', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=90', 542),
  ('Urfa Kebap', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', 543),
  ('Lahmacun', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=90', 544),
  ('Pide', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=90', 545),
  ('Dürüm', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=90', 546),
  ('Tavuk Döner', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', 547),
  ('Köfte', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=90', 548),
  ('Beyti', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', 549);

-- Kahvaltı çeşitleri
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Menemen', 'food', 'image', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=90', 550),
  ('Sucuklu Yumurta', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', 551),
  ('Serpme Kahvaltı', 'food', 'image', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=90', 552),
  ('Omlet', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', 553),
  ('Eggs Benedict', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', 554),
  ('Avocado Toast', 'food', 'image', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=90', 555),
  ('Pankek', 'food', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=90', 556),
  ('Waffle', 'food', 'image', 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=90', 557),
  ('Simit', 'food', 'image', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=90', 558),
  ('Börek', 'food', 'image', 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=90', 559),
  ('Gözleme', 'food', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=90', 560),
  ('Poğaça', 'food', 'image', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=90', 561);

-- Diğer yemekler (et, pilav, sebze)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Kuru Fasulye', 'food', 'image', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=90', 562),
  ('Pilav', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', 563),
  ('Izgara Köfte', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=90', 564),
  ('Tavuk Şiş', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', 565),
  ('Kuzu Tandır', 'food', 'image', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=90', 566),
  ('Biftek', 'food', 'image', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=90', 567),
  ('Falafel', 'food', 'image', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&q=90', 568),
  ('Ramen', 'food', 'image', 'https://images.unsplash.com/photo-1569718212165-3a2858982b79?w=800&q=90', 569),
  ('Taco', 'food', 'image', 'https://images.unsplash.com/photo-1565299585323-38174c3d3b0c?w=800&q=90', 570),
  ('Sushi', 'food', 'image', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=90', 571);

-- === migration-fix-2-block-template-height.sql ===
-- Mevcut "2 bloklu şablon" sistem şablonlarında blok yüksekliğini %100 yap (2 Bölmeli Düzen ile aynı görünsün)
UPDATE template_blocks tb
SET position_y = 0,
    height = 100
FROM templates t
WHERE tb.template_id = t.id
  AND t.block_count = 2
  AND t.is_system = true
  AND tb.height = 50;

-- === migration-fix-5-3-7-block-special-layout.sql ===
-- 5, 3 ve 7 bloklu şablonlarda "special" yerleşimi uygular (getGridLayout special dizisi).
-- 5 blok: sağdaki blok (index 2) 2 satır kaplar.
-- 3 blok: alttaki blok (index 2) tam genişlik.
-- 7 blok: ortadaki sütun (index 6) 2 satır kaplar.

-- ========== 5 BLOK: cols=3, rows=2, special [2] = blok 2 sağ sütun full height ==========
UPDATE template_blocks tb
SET
  position_x = CASE tb.block_index
    WHEN 0 THEN 0
    WHEN 1 THEN 100.0/3
    WHEN 2 THEN 200.0/3
    WHEN 3 THEN 0
    WHEN 4 THEN 100.0/3
    ELSE tb.position_x
  END,
  position_y = CASE tb.block_index
    WHEN 0 THEN 0
    WHEN 1 THEN 0
    WHEN 2 THEN 0
    WHEN 3 THEN 50
    WHEN 4 THEN 50
    ELSE tb.position_y
  END,
  width = CASE WHEN tb.block_index BETWEEN 0 AND 4 THEN 100.0/3 ELSE tb.width END,
  height = CASE tb.block_index WHEN 2 THEN 100 ELSE (CASE WHEN tb.block_index BETWEEN 0 AND 4 THEN 50 ELSE tb.height END) END
FROM templates t
WHERE tb.template_id = t.id
  AND t.block_count = 5
  AND tb.block_index < 5;

-- ========== 3 BLOK: cols=2, rows=2, special [2] = blok 2 tam genişlik alt ==========
UPDATE template_blocks tb
SET
  position_x = CASE tb.block_index WHEN 0 THEN 0 WHEN 1 THEN 50 WHEN 2 THEN 0 ELSE tb.position_x END,
  position_y = CASE tb.block_index WHEN 0 THEN 0 WHEN 1 THEN 0 WHEN 2 THEN 50 ELSE tb.position_y END,
  width = CASE tb.block_index WHEN 0 THEN 50 WHEN 1 THEN 50 WHEN 2 THEN 100 ELSE tb.width END,
  height = CASE WHEN tb.block_index <= 2 THEN 50 ELSE tb.height END
FROM templates t
WHERE tb.template_id = t.id
  AND t.block_count = 3
  AND tb.block_index < 3;

-- ========== 7 BLOK: cols=4, rows=2, special [6] = blok 6 orta sağ sütun full height ==========
UPDATE template_blocks tb
SET
  position_x = CASE tb.block_index
    WHEN 0 THEN 0
    WHEN 1 THEN 25
    WHEN 2 THEN 75
    WHEN 3 THEN 0
    WHEN 4 THEN 25
    WHEN 5 THEN 75
    WHEN 6 THEN 50
    ELSE tb.position_x
  END,
  position_y = CASE tb.block_index
    WHEN 0 THEN 0
    WHEN 1 THEN 0
    WHEN 2 THEN 0
    WHEN 3 THEN 50
    WHEN 4 THEN 50
    WHEN 5 THEN 50
    WHEN 6 THEN 0
    ELSE tb.position_y
  END,
  width = CASE WHEN tb.block_index <= 6 THEN 25 ELSE tb.width END,
  height = CASE tb.block_index WHEN 6 THEN 100 ELSE (CASE WHEN tb.block_index <= 6 THEN 50 ELSE tb.height END) END
FROM templates t
WHERE tb.template_id = t.id
  AND t.block_count = 7
  AND tb.block_index < 7;

-- === migration-fix-all-system-template-blocks-layout.sql ===
-- Tüm sistem/admin tarafından oluşturulan şablonların blok pozisyon ve boyutlarını
-- getGridLayout mantığına göre düzeltir (2 Bölmeli Düzen düzeltmesinin tamamına uygulanır).
-- Sadece is_system = true olan şablonlar güncellenir (schema'dan gelen split_2 vb. zaten doğru).

WITH layout AS (
  SELECT
    t.id AS template_id,
    t.block_count,
    CASE
      WHEN t.block_count <= 1 THEN 1
      WHEN t.block_count = 2 THEN 2
      WHEN t.block_count <= 4 THEN 2
      WHEN t.block_count <= 6 THEN 3
      WHEN t.block_count <= 8 THEN 4
      WHEN t.block_count = 9 THEN 3
      WHEN t.block_count <= 12 THEN 4
      WHEN t.block_count <= 16 THEN 4
      ELSE CEIL(SQRT(t.block_count))::int
    END AS cols,
    CASE
      WHEN t.block_count <= 1 THEN 1
      WHEN t.block_count = 2 THEN 1
      WHEN t.block_count <= 4 THEN 2
      WHEN t.block_count <= 6 THEN 2
      WHEN t.block_count <= 8 THEN 2
      WHEN t.block_count = 9 THEN 3
      WHEN t.block_count <= 12 THEN 3
      WHEN t.block_count <= 16 THEN 4
      ELSE CEIL(t.block_count::float / CEIL(SQRT(t.block_count)))::int
    END AS rows
  FROM templates t
  WHERE t.is_system = true
)
-- Sadece şablonun block_count'una ait blokları güncelle (block_index < block_count);
-- fazla blok kalırsa dokunma (constraint ihlali olmasın)
UPDATE template_blocks tb
SET
  position_x = (tb.block_index % GREATEST(p.cols, 1)) * (100.0 / GREATEST(p.cols, 1)),
  position_y = (tb.block_index / GREATEST(p.cols, 1)) * (100.0 / GREATEST(p.rows, 1)),
  width = 100.0 / GREATEST(p.cols, 1),
  height = 100.0 / GREATEST(p.rows, 1)
FROM layout p
WHERE tb.template_id = p.template_id
  AND tb.block_index < p.block_count;

-- === migration-fix-orhan-template-name.sql ===
-- orhan@gmail.com kullanıcısının "5 Bloklu Şablon (Kopya)" şablon adını
-- düzgün görünen şablona uyumlu "5 Bloklu Şablon 1 (kopya)" olarak düzeltir.
UPDATE templates
SET display_name = '5 Bloklu Şablon 1 (kopya)',
    updated_at = COALESCE(updated_at, NOW())
WHERE display_name = '5 Bloklu Şablon (Kopya)'
  AND scope = 'user'
  AND created_by = (SELECT id FROM users WHERE email = 'orhan@gmail.com' LIMIT 1);

-- === migration-import-all-categories.sql ===
-- Migration: Import all remaining categories from ContentLibrary.tsx

-- Insert Pasta items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Spaghetti Carbonara', 'food', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', 100),
('Penne Arrabbiata', 'food', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', 101),
('Fettuccine Alfredo', 'food', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', 102),
('Lasagna', 'food', 'image', 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&q=80', 103),
('Ravioli', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 104),
('Gnocchi', 'food', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', 105),
('Linguine', 'food', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', 106),
('Rigatoni', 'food', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', 107),
('Fusilli', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 108),
('Macaroni & Cheese', 'food', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', 109),
('Tagliatelle', 'food', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', 110),
('Pappardelle', 'food', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', 111)
ON CONFLICT DO NOTHING;

-- Insert Salad items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Caesar Salad', 'food', 'image', 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', 200),
('Greek Salad', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', 201),
('Cobb Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 202),
('Caprese Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80', 203),
('Waldorf Salad', 'food', 'image', 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=80', 204),
('Quinoa Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 205),
('Mediterranean Salad', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', 206),
('Asian Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 207),
('Kale Salad', 'food', 'image', 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', 208),
('Spinach Salad', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', 209),
('Arugula Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 210),
('Coleslaw', 'food', 'image', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80', 211)
ON CONFLICT DO NOTHING;

-- Insert Canadian cuisine items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Poutine', 'food', 'image', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80', 300),
('Maple Glazed Salmon', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 301),
('Butter Tarts', 'food', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80', 302),
('Tourtière', 'food', 'image', 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80', 303),
('Nanaimo Bars', 'food', 'image', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80', 304),
('BeaverTails', 'food', 'image', 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=80', 305),
('Montreal Smoked Meat', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 306),
('Bannock', 'food', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80', 307),
('Caesar Cocktail', 'food', 'image', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=80', 308),
('Split Pea Soup', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 309)
ON CONFLICT DO NOTHING;

-- Insert Regional/Turkish cuisine items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Kebap', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 400),
('Lahmacun', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 401),
('Mantı', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 402),
('Döner', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 403),
('İskender', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 404),
('Adana Kebap', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 405),
('Urfa Kebap', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 406),
('Çiğ Köfte', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 407),
('Börek', 'food', 'image', 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80', 408),
('Gözleme', 'food', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80', 409),
('Pide', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 410),
('Menemen', 'food', 'image', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80', 411)
ON CONFLICT DO NOTHING;

-- Insert European cuisine items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Coq au Vin', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', 500),
('Bouillabaisse', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 501),
('Ratatouille', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 502),
('Paella', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 503),
('Schnitzel', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 504),
('Goulash', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', 505),
('Risotto', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 506),
('Osso Buco', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', 507),
('Fish & Chips', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 508),
('Shepherd''s Pie', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', 509),
('Moussaka', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 510),
('Wiener Schnitzel', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 511)
ON CONFLICT DO NOTHING;

-- Insert Dessert items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Çikolatalı Pasta', 'food', 'image', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80', 600),
('Cheesecake', 'food', 'image', 'https://images.unsplash.com/photo-1533134242820-b4f3f2d8f7b3?w=800&q=80', 601),
('Tiramisu', 'food', 'image', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80', 602),
('Dondurma', 'food', 'image', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80', 603),
('Waffle', 'food', 'image', 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=80', 604),
('Pankek', 'food', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80', 605),
('Brownie', 'food', 'image', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80', 606),
('Kurabiye', 'food', 'image', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80', 607),
('Donut', 'food', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80', 608),
('Cupcake', 'food', 'image', 'https://images.unsplash.com/photo-1426869884541-df7117556757?w=800&q=80', 609),
('Macaron', 'food', 'image', 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&q=80', 610),
('Profiterol', 'food', 'image', 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=800&q=80', 611)
ON CONFLICT DO NOTHING;

-- Insert additional drink items (from drinks category in ContentLibrary.tsx)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Kola', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=80', 100),
('Limonata', 'drinks', 'drink', 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=800&q=80', 101),
('Portakal Suyu', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80', 102),
('Smoothie', 'drinks', 'drink', 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=80', 103),
('Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80', 104),
('Buzlu Çay', 'drinks', 'drink', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80', 105),
('Mojito', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=80', 106),
('Frappe', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80', 107),
('Espresso', 'drinks', 'drink', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80', 108),
('Cappuccino', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80', 109),
('Latte', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80', 110),
('Türk Kahvesi', 'drinks', 'drink', 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=800&q=80', 111),
('Çay', 'drinks', 'drink', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80', 112),
('Sıcak Çikolata', 'drinks', 'drink', 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=800&q=80', 113)
ON CONFLICT DO NOTHING;

-- Insert Badge items (as campaign_badge type - we need to add this type support)
-- Note: Badges will be stored with campaign_text field
INSERT INTO content_library (name, category, type, content, display_order) VALUES
('%50 İndirim', 'badges', 'icon', '%50 İNDİRİM', 1),
('%30 İndirim', 'badges', 'icon', '%30 İNDİRİM', 2),
('%20 İndirim', 'badges', 'icon', '%20 İNDİRİM', 3),
('%10 İndirim', 'badges', 'icon', '%10 İNDİRİM', 4),
('Yeni', 'badges', 'icon', 'YENİ', 5),
('Popüler', 'badges', 'icon', 'POPÜLER', 6),
('En İyi', 'badges', 'icon', 'EN İYİ', 7),
('Özel', 'badges', 'icon', 'ÖZEL', 8),
('Sınırlı', 'badges', 'icon', 'SINIRLI', 9),
('Tükendi', 'badges', 'icon', 'TÜKENDİ', 10),
('Vegan', 'badges', 'icon', 'VEGAN', 11),
('Helal', 'badges', 'icon', 'HELAL', 12),
('Organik', 'badges', 'icon', 'ORGANİK', 13),
('Glutensiz', 'badges', 'icon', 'GLUTENSİZ', 14),
('Acı', 'badges', 'icon', 'ACI', 15),
('Şef Önerisi', 'badges', 'icon', 'ŞEF ÖNERİSİ', 16),
('1+1', 'badges', 'icon', '1+1', 17),
('2+1', 'badges', 'icon', '2 AL 1 ÖDE', 18),
('Ücretsiz Teslimat', 'badges', 'icon', 'ÜCRETSİZ TESLİMAT', 19),
('Bugünün Fırsatı', 'badges', 'icon', 'BUGÜNÜN FIRSATI', 20)
ON CONFLICT DO NOTHING;

-- === migration-import-content-library.sql ===
-- Migration: Import existing content library items from ContentLibrary.tsx

-- First, clear existing data (optional - comment out if you want to keep existing)
-- TRUNCATE TABLE content_library;

-- Insert Food items
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Pizza Margherita', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 1),
('Pepperoni Pizza', 'food', 'image', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80', 2),
('Veggie Pizza', 'food', 'image', 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80', 3),
('Four Cheese', 'food', 'image', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', 4),
('Hawaiian Pizza', 'food', 'image', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', 5),
('Klasik Burger', 'food', 'image', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', 6),
('Cheese Burger', 'food', 'image', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', 7),
('Double Burger', 'food', 'image', 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80', 8),
('Bacon Burger', 'food', 'image', 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800&q=80', 9),
('Veggie Burger', 'food', 'image', 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=800&q=80', 10),
('Spagetti', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 11),
('Penne Arrabiata', 'food', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', 12),
('Fettuccine Alfredo', 'food', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', 13),
('Carbonara', 'food', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', 14),
('Club Sandwich', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 15),
('Chicken Wrap', 'food', 'image', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80', 16),
('Kızarmış Tavuk', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 17),
('Tavuk Kanat', 'food', 'image', 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800&q=80', 18),
('Caesar Salad', 'food', 'image', 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', 19),
('Greek Salad', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', 20),
('Pizza + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', 21),
('Kebap + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 22),
('Kebap + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 23),
('Hamburger + Kola + Patates', 'food', 'image', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', 24),
('Burger Menü', 'food', 'image', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', 25),
('Pizza Menü', 'food', 'image', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80', 26),
('Döner + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 27),
('Lahmacun + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 28),
('Tavuk + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 29),
('Tavuk + Patates + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800&q=80', 30),
('İskender + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 31),
('Adana Kebap + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 32),
('Pide + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 33),
('Makarna + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 34),
('Sandwich + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 35),
('Wrap + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80', 36),
('Tavuk Kanat + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800&q=80', 37),
('Fish & Chips + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 38),
('Taco + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1565299585323-38174c3d3b0c?w=800&q=80', 39),
('Sushi + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80', 40)
ON CONFLICT DO NOTHING;

-- Insert Drink items
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Coca Cola', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 1),
('Pepsi', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 2),
('Sprite', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 3),
('Fanta', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 4),
('7UP', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 5),
('Mountain Dew', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 6),
('Dr. Pepper', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 7),
('Coca Cola Zero', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 8),
('Pepsi Max', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 9),
('Schweppes', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 10),
('Red Bull', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 11),
('Monster Energy', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 12),
('Portakal Suyu', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', 13),
('Elma Suyu', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', 14),
('Limonata', 'drinks', 'drink', 'https://images.unsplash.com/photo-1523677011783-c91d1bbe2fdc?w=400&q=80', 15),
('Buzlu Çay', 'drinks', 'drink', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80', 16),
('Kahve', 'drinks', 'drink', 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&q=80', 17),
('Su', 'drinks', 'drink', 'https://images.unsplash.com/photo-1548839140-5a941f94e0ea?w=400&q=80', 18),
('Smoothie', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', 19),
('Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80', 20)
ON CONFLICT DO NOTHING;

-- Insert Icon items (with emoji content)
INSERT INTO content_library (name, category, type, content, display_order) VALUES
('Yıldız', 'icons', 'icon', '⭐', 1),
('Ateş', 'icons', 'icon', '🔥', 2),
('Yeni', 'icons', 'icon', '🆕', 3),
('Acı', 'icons', 'icon', '🌶️', 4),
('Kalp', 'icons', 'icon', '❤️', 5),
('Onay', 'icons', 'icon', '✅', 6),
('Işıltı', 'icons', 'icon', '✨', 7),
('Taç', 'icons', 'icon', '👑', 8),
('Hediye', 'icons', 'icon', '🎁', 9),
('Kupa', 'icons', 'icon', '🏆', 10),
('Pizza', 'icons', 'icon', '🍕', 11),
('Burger', 'icons', 'icon', '🍔', 12),
('Patates', 'icons', 'icon', '🍟', 13),
('Taco', 'icons', 'icon', '🌮', 14),
('Suşi', 'icons', 'icon', '🍣', 15),
('Makarna', 'icons', 'icon', '🍝', 16),
('Salata', 'icons', 'icon', '🥗', 17),
('Tavuk', 'icons', 'icon', '🍗', 18),
('Coca Cola', 'icons', 'icon', '🥤', 19),
('Pepsi', 'icons', 'icon', '🥤', 20),
('Sprite', 'icons', 'icon', '🥤', 21),
('Kahve', 'icons', 'icon', '☕', 22),
('Çay', 'icons', 'icon', '🍵', 23),
('Portakal Suyu', 'icons', 'icon', '🧃', 24),
('Limonata', 'icons', 'icon', '🍋', 25),
('Su', 'icons', 'icon', '💧', 26),
('Milkshake', 'icons', 'icon', '🥛', 27),
('Pasta', 'icons', 'icon', '🍰', 28),
('Dondurma', 'icons', 'icon', '🍦', 29),
('Kurabiye', 'icons', 'icon', '🍪', 30),
('Donut', 'icons', 'icon', '🍩', 31),
('Vegan', 'icons', 'icon', '🌱', 32),
('Helal', 'icons', 'icon', '☪️', 33),
('Glutensiz', 'icons', 'icon', '🌾', 34),
('Organik', 'icons', 'icon', '🍃', 35),
('Baharatlı', 'icons', 'icon', '🔥', 36),
('Şef Önerisi', 'icons', 'icon', '👨‍🍳', 37),
('Hızlı', 'icons', 'icon', '⏱️', 38),
('İndirim', 'icons', 'icon', '💰', 39)
ON CONFLICT DO NOTHING;

-- Insert Background items
INSERT INTO content_library (name, category, type, url, gradient, color, display_order) VALUES
('Pizza Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&q=90', NULL, NULL, 1),
('Burger Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1920&q=90', NULL, NULL, 2),
('Makarna Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1920&q=90', NULL, NULL, 3),
('Sushi Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=1920&q=90', NULL, NULL, 4),
('Tavuk Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=1920&q=90', NULL, NULL, 5),
('Salata Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&q=90', NULL, NULL, 6),
('Kahvaltı Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1920&q=90', NULL, NULL, 7),
('Tatlı Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1920&q=90', NULL, NULL, 8),
('Barbekü Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1920&q=90', NULL, NULL, 9),
('Deniz Ürünleri Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1920&q=90', NULL, NULL, 10),
('Kırmızı Gradyan', 'backgrounds', 'background', NULL, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', NULL, 11),
('Mavi Gradyan', 'backgrounds', 'background', NULL, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', NULL, 12),
('Yeşil Gradyan', 'backgrounds', 'background', NULL, 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', NULL, 13),
('Turuncu Gradyan', 'backgrounds', 'background', NULL, 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', NULL, 14),
('Koyu Mavi', 'backgrounds', 'background', NULL, NULL, '#1a237e', 15),
('Koyu Kırmızı', 'backgrounds', 'background', NULL, NULL, '#b71c1c', 16),
('Koyu Yeşil', 'backgrounds', 'background', NULL, NULL, '#1b5e20', 17)
ON CONFLICT DO NOTHING;

-- Insert Text template items
INSERT INTO content_library (name, category, type, template, sample, display_order) VALUES
('Başlık', 'text', 'text', 'title', 'Başlık Metni', 1),
('Alt Başlık', 'text', 'text', 'subtitle', 'Alt başlık metni', 2),
('Fiyat', 'text', 'text', 'price', '₺99.99', 3),
('Açıklama', 'text', 'text', 'description', 'Ürün açıklaması...', 4)
ON CONFLICT DO NOTHING;

-- === migration-increase-block-count-limit.sql ===
-- ============================================
-- MIGRATION: Increase block_count limit to 16
-- ============================================

-- Update CHECK constraint to allow up to 16 blocks
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_block_count_check;
ALTER TABLE templates ADD CONSTRAINT templates_block_count_check CHECK (block_count >= 1 AND block_count <= 16);

-- === migration-invoice-auto-number-trigger.sql ===
-- Faturalara otomatik numara: INSERT sırasında invoice_number boşsa otomatik atanır
-- Format: INV-YYYY-NNNNN (ör. INV-2025-00001)

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

CREATE OR REPLACE FUNCTION set_invoice_number_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payments_auto_invoice_number ON payments;
CREATE TRIGGER trigger_payments_auto_invoice_number
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number_if_null();

-- === migration-menu-pages.sql ===
-- Menü sayfaları: Her menü birden fazla sayfaya sahip olabilir
-- Sayfa isimleri menus.pages_config'de, ürünlerin sayfa bilgisi menu_items.page_index'te

ALTER TABLE menus ADD COLUMN IF NOT EXISTS pages_config JSONB DEFAULT '[{"name":"Sayfa 1","order":0}]';
COMMENT ON COLUMN menus.pages_config IS 'Sayfa yapısı: [{"name":"İçecekler","order":0},{"name":"Yemekler","order":1}]';

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS page_index INTEGER DEFAULT 0;
COMMENT ON COLUMN menu_items.page_index IS 'Hangi sayfada (0-based)';

-- === migration-move-pasta-to-pasta-category.sql ===
-- Yiyecekler (food) kategorisindeki makarna ürünlerini Makarnalar (pasta) kategorisine taşı

UPDATE content_library 
SET category = 'pasta'
WHERE category = 'food' 
AND (
  name ILIKE '%spaghetti%' OR name ILIKE '%carbonara%' OR name ILIKE '%penne%' 
  OR name ILIKE '%arrabbiata%' OR name ILIKE '%arrabiata%' OR name ILIKE '%fettuccine%'
  OR name ILIKE '%alfredo%' OR name ILIKE '%lasagna%' OR name ILIKE '%ravioli%'
  OR name ILIKE '%gnocchi%' OR name ILIKE '%linguine%' OR name ILIKE '%rigatoni%'
  OR name ILIKE '%fusilli%' OR name ILIKE '%macaroni%' OR name ILIKE '%tagliatelle%'
  OR name ILIKE '%pappardelle%' OR name ILIKE '%spagetti%'
);

-- === migration-plan-names.sql ===
-- Paket isimleri: Starter, Growth, Pro, Business, Enterprise
UPDATE plans SET display_name = 'Starter'   WHERE max_screens = 3;
UPDATE plans SET display_name = 'Growth'    WHERE max_screens = 5;
UPDATE plans SET display_name = 'Pro'       WHERE max_screens = 7;
UPDATE plans SET display_name = 'Business'   WHERE max_screens = 10;
UPDATE plans SET display_name = 'Enterprise' WHERE max_screens = -1;

-- === migration-plans-1-3-1-5-1-7-1-10-unlimited.sql ===
-- Planlar: 1-3, 1-5, 1-7, 1-10 ekran + Sınırsız (15 TV üzerinden hesaplanır)
-- TV başı 12.99 USD, yıllık %10 indirim

-- 1-3 ekran: 3 * 12.99 = 38.97
UPDATE plans SET
  display_name = '1-3 Screens',
  name = '1-3-screens',
  price_monthly = 38.97,
  price_yearly = ROUND(38.97 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = 3;

-- 1-5 ekran: 5 * 12.99 = 64.95
UPDATE plans SET
  display_name = '1-5 Screens',
  name = '1-5-screens',
  price_monthly = 64.95,
  price_yearly = ROUND(64.95 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = 5;

-- 1-7 ekran: 7 * 12.99 = 90.93
UPDATE plans SET
  display_name = '1-7 Screens',
  name = '1-7-screens',
  price_monthly = 90.93,
  price_yearly = ROUND(90.93 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = 7;

-- 1-10 ekran: 10 * 12.99 = 129.90
UPDATE plans SET
  display_name = '1-10 Screens',
  name = '1-10-screens',
  price_monthly = 129.90,
  price_yearly = ROUND(129.90 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = 10;

-- Sınırsız: 15 TV üzerinden = 15 * 12.99 = 194.85
UPDATE plans SET
  display_name = 'Unlimited (15 TVs)',
  name = 'enterprise',
  price_monthly = 194.85,
  price_yearly = ROUND(194.85 * 12 * 0.9, 2),
  is_active = true
WHERE max_screens = -1;

-- 1-7 planı yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-7-screens', '1-7 Screens', 7, 90.93, ROUND(90.93 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 7);

-- 1-10 planı yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-10-screens', '1-10 Screens', 10, 129.90, ROUND(129.90 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 10);

-- Diğer planları (1, 2, 4 ekran vb.) listede gösterme
UPDATE plans SET is_active = false WHERE max_screens IN (0, 1, 2, 4, 6, 8, 9);

-- === migration-prices-end-99.sql ===
-- Tüm fiyatlar .99 ile biter (aylık ve yıllık)

UPDATE plans SET price_monthly = 35.99,  price_yearly = 388.99  WHERE max_screens = 3;
UPDATE plans SET price_monthly = 59.99,  price_yearly = 647.99  WHERE max_screens = 5;
UPDATE plans SET price_monthly = 83.99,  price_yearly = 907.99  WHERE max_screens = 7;
UPDATE plans SET price_monthly = 119.99, price_yearly = 1294.99 WHERE max_screens = 10;
UPDATE plans SET price_monthly = 179.99, price_yearly = 1943.99 WHERE max_screens = -1;

-- === migration-pricing-11-99.sql ===
-- Fiyat güncellemesi: 1 ekran = 11.99$, 2-5 ekran buna göre, yıllıkta %10 indirim, artı vergi (frontend'de)
-- 1 screen: 11.99, 2: 23.99, 3: 35.99, 4: 47.99, 5: 59.99
-- Yıllık = aylık * 12 * 0.9 (%10 indirim)

-- Mevcut planları güncelle
UPDATE plans SET price_monthly = 11.99, price_yearly = ROUND(11.99 * 12 * 0.9, 2), display_name = '1 Screen' WHERE max_screens = 1;
UPDATE plans SET price_monthly = 23.99, price_yearly = ROUND(23.99 * 12 * 0.9, 2), display_name = '2 Screens' WHERE max_screens = 2;
UPDATE plans SET price_monthly = 35.99, price_yearly = ROUND(35.99 * 12 * 0.9, 2), display_name = '3 Screens' WHERE max_screens = 3;
UPDATE plans SET price_monthly = 47.99, price_yearly = ROUND(47.99 * 12 * 0.9, 2), display_name = '4 Screens' WHERE max_screens = 4;
UPDATE plans SET price_monthly = 59.99, price_yearly = ROUND(59.99 * 12 * 0.9, 2), display_name = '5 Screens' WHERE max_screens = 5;
UPDATE plans SET price_yearly = ROUND(price_monthly * 12 * 0.9, 2) WHERE max_screens = -1;

-- 2, 3, 4 ekran planları yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '2-screens', '2 Screens', 2, 23.99, ROUND(23.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 2);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '3-screens', '3 Screens', 3, 35.99, ROUND(35.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 3);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '4-screens', '4 Screens', 4, 47.99, ROUND(47.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 4);

-- === migration-pricing-11-99-per-tv.sql ===
-- Fiyatlandırma: Her TV (ekran) başı 11.99 USD (aylık). Yıllık %10 indirim.
-- 1-3: 35.97, 1-5: 59.95, 1-7: 83.93, 1-10: 119.90, Sınırsız (15 TV): 179.85

UPDATE plans SET
  price_monthly = 35.97,
  price_yearly = ROUND(35.97 * 12 * 0.9, 2)
WHERE max_screens = 3;

UPDATE plans SET
  price_monthly = 59.95,
  price_yearly = ROUND(59.95 * 12 * 0.9, 2)
WHERE max_screens = 5;

UPDATE plans SET
  price_monthly = 83.93,
  price_yearly = ROUND(83.93 * 12 * 0.9, 2)
WHERE max_screens = 7;

UPDATE plans SET
  price_monthly = 119.90,
  price_yearly = ROUND(119.90 * 12 * 0.9, 2)
WHERE max_screens = 10;

UPDATE plans SET
  price_monthly = 179.85,
  price_yearly = ROUND(179.85 * 12 * 0.9, 2)
WHERE max_screens = -1;

-- === migration-pricing-12-99-per-tv.sql ===
-- Fiyatlandırma: Her TV (ekran) başı 12.99 USD (aylık). Yıllık %10 indirim.
-- 1 ekran: 12.99, 2: 25.98, 3: 38.97, 4: 51.96, 5: 64.95
-- Yıllık = aylık * 12 * 0.9 (%10 indirim)

-- Mevcut planları güncelle (max_screens'a göre)
UPDATE plans SET price_monthly = 12.99, price_yearly = ROUND(12.99 * 12 * 0.9, 2), display_name = '1 Screen', name = '1-screen' WHERE max_screens = 1;
UPDATE plans SET price_monthly = 25.98, price_yearly = ROUND(25.98 * 12 * 0.9, 2), display_name = '2 Screens', name = '2-screens' WHERE max_screens = 2;
UPDATE plans SET price_monthly = 38.97, price_yearly = ROUND(38.97 * 12 * 0.9, 2), display_name = '3 Screens', name = '3-screens' WHERE max_screens = 3;
UPDATE plans SET price_monthly = 51.96, price_yearly = ROUND(51.96 * 12 * 0.9, 2), display_name = '4 Screens', name = '4-screens' WHERE max_screens = 4;
UPDATE plans SET price_monthly = 64.95, price_yearly = ROUND(64.95 * 12 * 0.9, 2), display_name = '5 Screens', name = '5-screens' WHERE max_screens = 5;
UPDATE plans SET price_yearly = ROUND(price_monthly * 12 * 0.9, 2) WHERE max_screens = -1;

-- Eksik ekran planlarını ekle (2, 3, 4 yoksa)
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '2-screens', '2 Screens', 2, 25.98, ROUND(25.98 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 2);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '3-screens', '3 Screens', 3, 38.97, ROUND(38.97 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 3);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '4-screens', '4 Screens', 4, 51.96, ROUND(51.96 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 4);

-- 1 ekran planı yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '1-screen', '1 Screen', 1, 12.99, ROUND(12.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 1);

-- 5 ekran planı yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '5-screens', '5 Screens', 5, 64.95, ROUND(64.95 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 5);

-- Sınırsız plan yoksa ekle (örnek fiyat)
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'enterprise', 'Unlimited Screens', -1, 99.99, ROUND(99.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = -1);

-- === migration-pricing-13-99-per-tv.sql ===
-- Plan fiyatları: TV başına 13.99
-- 3 ekran: 41.99, 5: 69.99, 7: 97.99, 10: 139.99, sınırsız (15 TV): 209.99
-- Yıllık: aylık * 12 * 0.9 (%10 indirim)

UPDATE plans SET price_monthly = 41.99,  price_yearly = ROUND(41.99 * 12 * 0.9, 2)  WHERE max_screens = 3;
UPDATE plans SET price_monthly = 69.99,  price_yearly = ROUND(69.99 * 12 * 0.9, 2)  WHERE max_screens = 5;
UPDATE plans SET price_monthly = 97.99,  price_yearly = ROUND(97.99 * 12 * 0.9, 2)  WHERE max_screens = 7;
UPDATE plans SET price_monthly = 139.99, price_yearly = ROUND(139.99 * 12 * 0.9, 2) WHERE max_screens = 10;
UPDATE plans SET price_monthly = 209.99, price_yearly = ROUND(209.99 * 12 * 0.9, 2) WHERE max_screens = -1;

-- === migration-pricing-14-99.sql ===
-- Fiyat güncellemesi: 1 ekran = 14.99$
-- 2-5 ekran: ekran başı 14.99, yıllıkta %15 indirim
-- Yıllık = aylık * 12 * 0.85 (%15 indirim)

-- Mevcut planları güncelle
UPDATE plans SET price_monthly = 14.99, price_yearly = ROUND(14.99 * 12 * 0.85, 2), display_name = '1 Screen' WHERE max_screens = 1;
UPDATE plans SET price_monthly = 29.98, price_yearly = ROUND(29.98 * 12 * 0.85, 2), display_name = '2 Screens' WHERE max_screens = 2;
UPDATE plans SET price_monthly = 44.97, price_yearly = ROUND(44.97 * 12 * 0.85, 2), display_name = '3 Screens' WHERE max_screens = 3;
UPDATE plans SET price_monthly = 59.96, price_yearly = ROUND(59.96 * 12 * 0.85, 2), display_name = '4 Screens' WHERE max_screens = 4;
UPDATE plans SET price_monthly = 74.95, price_yearly = ROUND(74.95 * 12 * 0.85, 2), display_name = '5 Screens' WHERE max_screens = 5;
UPDATE plans SET price_yearly = ROUND(price_monthly * 12 * 0.85, 2) WHERE max_screens = -1;

-- 2, 3, 4 ekran planları yoksa ekle
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '2-screens', '2 Screens', 2, 29.98, ROUND(29.98 * 12 * 0.85, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 2);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '3-screens', '3 Screens', 3, 44.97, ROUND(44.97 * 12 * 0.85, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 3);

INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT '4-screens', '4 Screens', 4, 59.96, ROUND(59.96 * 12 * 0.85, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 4);

-- === migration-pricing-packages.sql ===
-- Fiyatlandırma: 5 paket (1-3, 1-5, 1-7, 1-10, Sınırsız). Eski planları kaldır.

-- Hiç abonelikte kullanılmayan eski planları sil
DELETE FROM plans
WHERE id NOT IN (SELECT plan_id FROM subscriptions)
  AND (max_screens NOT IN (3, 5, 7, 10, -1) OR name NOT IN ('starter-plan', 'pro', 'growth-plan', 'scale-plan', 'enterprise'));

-- Kalan eski planları (4 ekran dahil) pasif yap; sadece 5 paket aktif kalacak
UPDATE plans SET is_active = false WHERE max_screens NOT IN (3, 5, 7, 10, -1) OR name NOT IN ('starter-plan', 'pro', 'growth-plan', 'scale-plan', 'enterprise');

-- Fiyat: ekran başı 12.99 USD (aylık). Yıllık %10 indirim.
-- 1-3 Ekran: 3 × 12.99 = 38.97 → 38.99
UPDATE plans SET name = 'starter-plan', display_name = 'Starter Plan', price_monthly = 38.99, price_yearly = ROUND(38.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = 3;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'starter-plan', 'Starter Plan', 3, 38.99, ROUND(38.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 3);

-- 1-5 Ekran: 5 × 12.99 = 64.95 → 64.99
UPDATE plans SET name = 'pro', display_name = 'Pro Plan', price_monthly = 64.99, price_yearly = ROUND(64.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = 5;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'pro', 'Pro Plan', 5, 64.99, ROUND(64.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 5);

-- 1-7 Ekran: 7 × 12.99 = 90.93 → 90.99
UPDATE plans SET name = 'growth-plan', display_name = 'Growth Plan', price_monthly = 90.99, price_yearly = ROUND(90.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = 7;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'growth-plan', 'Growth Plan', 7, 90.99, ROUND(90.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 7);

-- 1-10 Ekran: 10 × 12.99 = 129.90 → 129.99
UPDATE plans SET name = 'scale-plan', display_name = 'Scale Plan', price_monthly = 129.99, price_yearly = ROUND(129.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = 10;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'scale-plan', 'Scale Plan', 10, 129.99, ROUND(129.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = 10);

-- Sınırsız: 15 TV ekranı üzerinden fiyatlandırma — 15 × 12.99 = 194.85 → 194.99
UPDATE plans SET name = 'enterprise', display_name = 'Enterprise Plan', price_monthly = 194.99, price_yearly = ROUND(194.99 * 12 * 0.9, 2), is_active = true WHERE max_screens = -1;
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active)
SELECT 'enterprise', 'Enterprise Plan', -1, 194.99, ROUND(194.99 * 12 * 0.9, 2), true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE max_screens = -1);

-- Eski planları tamamen kaldır: abonelikte kullanılmayan pasif planları sil
DELETE FROM plans
WHERE is_active = false
  AND id NOT IN (SELECT plan_id FROM subscriptions WHERE plan_id IS NOT NULL);

-- === migration-remove-regional-tek-menu-category.sql ===
-- Tek Menü / regional kategorisini kaldır (frontend ve API’de artık kullanılmıyor)
DELETE FROM content_library_categories WHERE slug IN ('regional', 'tek-menu', 'tek_menu');

-- === migration-stripe-price-1screen.sql ===
-- Stripe Price IDs for 1 Screen plan
-- Aylık: price_1SvvDILHuzvG29x51LeH1kh2
-- Yıllık: price_1SvvTRLHuzvG29x5KIS9L9TX

UPDATE plans
SET stripe_price_id_monthly = 'price_1SvvDILHuzvG29x51LeH1kh2',
    stripe_price_id_yearly = 'price_1SvvTRLHuzvG29x5KIS9L9TX',
    updated_at = NOW()
WHERE max_screens = 1;

-- === add_advanced_features.sql ===
-- Migration: Add Advanced Features
-- Run this after the base schema.sql
-- Adds: Animations, Time-based Menus, Multi-language, Stripe Subscriptions

-- ============================================
-- 1. ANIMATION CONFIGURATION (Screens)
-- ============================================
-- Add animation fields to screens table
ALTER TABLE screens
ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'fade' CHECK (animation_type IN ('fade', 'slide', 'zoom')),
ADD COLUMN IF NOT EXISTS animation_duration INTEGER DEFAULT 500; -- milliseconds

CREATE INDEX IF NOT EXISTS idx_screens_animation_type ON screens(animation_type);

-- ============================================
-- 2. TIME-BASED MENU SCHEDULING
-- ============================================
CREATE TABLE IF NOT EXISTS menu_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    start_time TIME NOT NULL, -- e.g., '08:00:00' for 8 AM
    end_time TIME NOT NULL,    -- e.g., '12:00:00' for 12 PM
    day_of_week INTEGER,       -- 0-6 (0=Sunday, optional, NULL = all days)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_day CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6))
);

CREATE INDEX IF NOT EXISTS idx_menu_schedules_screen_id ON menu_schedules(screen_id);
CREATE INDEX IF NOT EXISTS idx_menu_schedules_menu_id ON menu_schedules(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_schedules_time ON menu_schedules(start_time, end_time);

DROP TRIGGER IF EXISTS update_menu_schedules_updated_at ON menu_schedules;
CREATE TRIGGER update_menu_schedules_updated_at BEFORE UPDATE ON menu_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. MULTI-LANGUAGE SUPPORT
-- ============================================
-- Languages table
CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE, -- ISO 639-1 code (e.g., 'en', 'es', 'fr')
    name TEXT NOT NULL,        -- Display name (e.g., 'English', 'Spanish')
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu item translations
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

-- Add language preference to screens
ALTER TABLE screens
ADD COLUMN IF NOT EXISTS language_code TEXT REFERENCES languages(code) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_languages_code ON languages(code);
CREATE INDEX IF NOT EXISTS idx_menu_item_translations_item_id ON menu_item_translations(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_translations_lang ON menu_item_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_screens_language ON screens(language_code);

DROP TRIGGER IF EXISTS update_languages_updated_at ON languages;
CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON languages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_item_translations_updated_at ON menu_item_translations;
CREATE TRIGGER update_menu_item_translations_updated_at BEFORE UPDATE ON menu_item_translations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default languages
INSERT INTO languages (code, name, is_default, is_active) VALUES
    ('en', 'English', true, true),
    ('es', 'Spanish', false, true),
    ('fr', 'French', false, true),
    ('de', 'German', false, true),
    ('it', 'Italian', false, true),
    ('pt', 'Portuguese', false, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 4. SAAS PACKAGES & STRIPE SUBSCRIPTIONS
-- ============================================
-- Subscription plans
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'basic', 'pro', 'enterprise'
    display_name TEXT NOT NULL, -- 'Basic Plan', 'Pro Plan', 'Enterprise Plan'
    max_screens INTEGER NOT NULL, -- -1 for unlimited
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2),
    stripe_price_id_monthly TEXT, -- Stripe Price ID
    stripe_price_id_yearly TEXT,
    features JSONB, -- Additional features as JSON
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    stripe_subscription_id TEXT UNIQUE, -- Stripe Subscription ID
    stripe_customer_id TEXT, -- Stripe Customer ID
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment history
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

-- Add subscription reference to businesses (optional, can query subscriptions table)
-- Keeping businesses table clean, query via subscriptions table

CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_intent_id);

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default plans (1 ekran = 14.99$, yıllık %15 indirim)
INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active) VALUES
    ('basic', '1 Screen', 1, 14.99, 152.90, true),
    ('pro', '5 Screens', 5, 74.95, 764.49, true),
    ('enterprise', 'Enterprise Plan', -1, 149.99, 1529.89, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies for New Tables
-- ============================================

-- Enable RLS on new tables
ALTER TABLE menu_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Menu Schedules: Business users can manage schedules for their screens
CREATE POLICY "Users can manage menu schedules in their business"
    ON menu_schedules FOR ALL
    USING (
        screen_id IN (
            SELECT s.id FROM screens s
            INNER JOIN users u ON s.business_id = u.business_id
            WHERE u.id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Languages: Public read, super admin write
CREATE POLICY "Anyone can view languages"
    ON languages FOR SELECT
    USING (true);

CREATE POLICY "Super admins can manage languages"
    ON languages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Menu Item Translations: Business users can manage translations for their items
CREATE POLICY "Users can manage translations in their business"
    ON menu_item_translations FOR ALL
    USING (
        menu_item_id IN (
            SELECT mi.id FROM menu_items mi
            INNER JOIN menus m ON mi.menu_id = m.id
            INNER JOIN users u ON m.business_id = u.business_id
            WHERE u.id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Plans: Public read, super admin write
CREATE POLICY "Anyone can view plans"
    ON plans FOR SELECT
    USING (true);

CREATE POLICY "Super admins can manage plans"
    ON plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Subscriptions: Business users can view their own subscriptions
CREATE POLICY "Users can view subscriptions in their business"
    ON subscriptions FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

CREATE POLICY "Users can update subscriptions in their business"
    ON subscriptions FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Payments: Business users can view payments for their subscriptions
CREATE POLICY "Users can view payments in their business"
    ON payments FOR SELECT
    USING (
        subscription_id IN (
            SELECT s.id FROM subscriptions s
            INNER JOIN users u ON s.business_id = u.business_id
            WHERE u.id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get active menu for a screen based on current time
CREATE OR REPLACE FUNCTION get_active_menu_for_screen(p_screen_id UUID)
RETURNS UUID AS $$
DECLARE
    v_menu_id UUID;
    v_current_time TIME;
    v_current_day INTEGER;
BEGIN
    v_current_time := CURRENT_TIME;
    v_current_day := EXTRACT(DOW FROM CURRENT_TIMESTAMP)::INTEGER;

    -- First, try to find a scheduled menu for current time and day
    SELECT menu_id INTO v_menu_id
    FROM menu_schedules
    WHERE screen_id = p_screen_id
      AND is_active = true
      AND (day_of_week IS NULL OR day_of_week = v_current_day)
      AND start_time <= v_current_time
      AND end_time > v_current_time
    ORDER BY start_time DESC
    LIMIT 1;

    -- If no scheduled menu found, return the first assigned menu (fallback)
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

-- Function to check if business has reached screen limit
CREATE OR REPLACE FUNCTION check_screen_limit(p_business_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_screens INTEGER;
    v_current_screens INTEGER;
    v_subscription_status TEXT;
BEGIN
    -- Get current subscription
    SELECT s.status, p.max_screens INTO v_subscription_status, v_max_screens
    FROM subscriptions s
    INNER JOIN plans p ON s.plan_id = p.id
    WHERE s.business_id = p_business_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;

    -- If no active subscription, deny
    IF v_subscription_status IS NULL OR v_subscription_status != 'active' THEN
        RETURN false;
    END IF;

    -- Unlimited plan
    IF v_max_screens = -1 THEN
        RETURN true;
    END IF;

    -- Count current screens
    SELECT COUNT(*) INTO v_current_screens
    FROM screens
    WHERE business_id = p_business_id;

    RETURN v_current_screens < v_max_screens;
END;
$$ LANGUAGE plpgsql;

-- === add_billing_interval.sql ===
-- Add billing_interval to subscriptions (monthly/yearly)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (billing_interval IN ('monthly', 'yearly'));

-- === add_display_scale_indexes.sql ===
-- Migration: Display scale indexes and optional fast path
-- Run after base schema. Reduces query time for /public/screen/:token (1000+ TVs).

-- ============================================
-- 1. INDEXES FOR DISPLAY PATH
-- ============================================

-- Screen lookup by public_slug / public_token (display URL)
CREATE INDEX IF NOT EXISTS idx_screens_public_slug_active
  ON screens(public_slug) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_screens_public_token_active
  ON screens(public_token) WHERE is_active = true;

-- Template rotations per screen
CREATE INDEX IF NOT EXISTS idx_screen_template_rotations_screen_active
  ON screen_template_rotations(screen_id, display_order) WHERE is_active = true;

-- Block contents by template block (rotation path)
CREATE INDEX IF NOT EXISTS idx_template_block_contents_block_active
  ON template_block_contents(template_block_id, display_order) WHERE is_active = true;

-- Block contents by screen block (screen template path)
CREATE INDEX IF NOT EXISTS idx_screen_block_contents_block_active
  ON screen_block_contents(screen_block_id, display_order) WHERE is_active = true;

-- Menu items by menu (product_list batch)
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_display
  ON menu_items(menu_id, display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_menu_item_translations_item_lang
  ON menu_item_translations(menu_item_id, language_code);

-- === add_payment_failures.sql ===
-- Migration: Add payment_failures table for tracking failed payment attempts
-- When Stripe sends invoice.payment_failed, we log here for admin reports

CREATE TABLE IF NOT EXISTS payment_failures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- === add_tv_ui_customization.sql ===
-- Add TV UI Customization Fields to Screens Table
-- Run this after add_advanced_features.sql

-- Add UI customization fields
ALTER TABLE screens
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'system-ui',
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#fbbf24', -- Amber/gold default
ADD COLUMN IF NOT EXISTS background_style TEXT DEFAULT 'gradient' CHECK (background_style IN ('gradient', 'solid', 'image')),
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#0f172a', -- Slate 900
ADD COLUMN IF NOT EXISTS background_image_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_screens_ui_config ON screens(font_family, primary_color);

-- Update RLS policy to allow reading these fields (already covered by existing policies)

COMMENT ON COLUMN screens.font_family IS 'Font family for TV display (e.g., system-ui, serif, sans-serif)';
COMMENT ON COLUMN screens.primary_color IS 'Primary accent color (hex format)';
COMMENT ON COLUMN screens.background_style IS 'Background style: gradient, solid, or image';
COMMENT ON COLUMN screens.background_color IS 'Background color (hex format)';
COMMENT ON COLUMN screens.background_image_url IS 'URL for background image (if background_style is image)';
COMMENT ON COLUMN screens.logo_url IS 'Business logo URL to display on TV';

-- === migration-contact-info-home-channels.sql ===
-- contact_info: tek satır (singleton) - ana sayfa iletişim bilgileri
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

-- home_channels: ana sayfa kanal listesi (sıra önemli)
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

-- === migration-ensure-password-hash.sql ===
-- Backend login (password_hash) kullanıyorsa users tablosunda bu sütun olmalı.
-- Supabase SQL Editor'de bir kez çalıştırın; sütun yoksa eklenir.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- === supabase-run-migrations.sql ===
-- ============================================================
-- Supabase'de çalıştır: users tablosunda eksik sütunları ekle
-- (frame_type, ticker_text, ticker_style, preferred_locale, reference_number)
-- Sırayla SQL Editor'da çalıştır veya tek seferde bu dosyayı çalıştır.
-- ============================================================

-- 1) screens: frame_type, ticker_text, ticker_style
ALTER TABLE screens ADD COLUMN IF NOT EXISTS frame_type TEXT DEFAULT 'none';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ticker_text TEXT DEFAULT '';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ticker_style TEXT DEFAULT 'default';

-- 2) users: preferred_locale
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en' CHECK (preferred_locale IN ('en', 'tr', 'fr'));
UPDATE users SET preferred_locale = 'en' WHERE preferred_locale IS NULL;

-- 3) users: reference_number, referred_by_user_id (giriş hatası: column u.reference_number does not exist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reference_number ON users (reference_number) WHERE reference_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users (referred_by_user_id) WHERE referred_by_user_id IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS user_reference_seq;
CREATE SEQUENCE IF NOT EXISTS admin_reference_seq;

-- Mevcut business_user'lara 00001, 00002...
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users
  WHERE role = 'business_user' AND (reference_number IS NULL OR reference_number = '')
),
max_ref AS (
  SELECT COALESCE(MAX(CAST(reference_number AS INTEGER)), 0)::int AS m FROM users WHERE reference_number ~ '^\\d+$'
)
UPDATE users u
SET reference_number = LPAD((m.m + o.rn)::text, 5, '0')
FROM ordered o, max_ref m
WHERE u.id = o.id;

-- Mevcut admin/super_admin'lere ADM-00001, ADM-00002...
WITH max_adm AS (
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)), 0)::int AS m
  FROM users
  WHERE reference_number ~ '^ADM-\\d+$'
),
ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users
  WHERE role IN ('admin', 'super_admin')
    AND (reference_number IS NULL OR reference_number = '' OR reference_number !~ '^ADM-\\d+$')
)
UPDATE users u
SET reference_number = 'ADM-' || LPAD((m.m + o.rn)::text, 5, '0')
FROM ordered o, max_adm m
WHERE u.id = o.id;

-- Sequence'leri güncelle
SELECT setval('user_reference_seq', COALESCE((SELECT MAX(CAST(reference_number AS INTEGER)) FROM users WHERE reference_number ~ '^\\d+$'), 0) + 1);
SELECT setval('admin_reference_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)) FROM users WHERE reference_number ~ '^ADM-\\d+$'), 0) + 1);

`;
