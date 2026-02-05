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

CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON languages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
