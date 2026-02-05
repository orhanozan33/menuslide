-- Digital Signage / Online Menu Management System
-- PostgreSQL Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ============================================
-- USERS TABLE (Supabase Auth integration)
-- ============================================
-- Note: Supabase Auth handles the auth.users table
-- This table extends it with business-specific data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'business_user' CHECK (role IN ('super_admin', 'business_user')),
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BUSINESSES TABLE
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
-- MENUS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    slide_duration INTEGER DEFAULT 5, -- seconds per slide
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
    public_token TEXT NOT NULL UNIQUE, -- For public URL access
    location TEXT,
    is_active BOOLEAN DEFAULT true,
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
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_menus_business_id ON menus(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id ON menu_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON menu_items(menu_id, display_order);
CREATE INDEX IF NOT EXISTS idx_screens_business_id ON screens(business_id);
CREATE INDEX IF NOT EXISTS idx_screens_public_token ON screens(public_token);
CREATE INDEX IF NOT EXISTS idx_screen_menu_screen_id ON screen_menu(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_menu_menu_id ON screen_menu(menu_id);

-- ============================================
-- FUNCTIONS for updated_at timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS for updated_at
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

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_menu ENABLE ROW LEVEL SECURITY;

-- Users: Super admins can see all, business users see only their own
CREATE POLICY "Super admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Businesses: Super admins can see all, business users see only their own
CREATE POLICY "Super admins can manage all businesses"
    ON businesses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

CREATE POLICY "Business users can view their own business"
    ON businesses FOR SELECT
    USING (
        id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- Menus: Business users can only access their business's menus
CREATE POLICY "Users can manage menus in their business"
    ON menus FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Menu Items: Business users can only access items in their business's menus
CREATE POLICY "Users can manage menu items in their business"
    ON menu_items FOR ALL
    USING (
        menu_id IN (
            SELECT m.id FROM menus m
            INNER JOIN users u ON m.business_id = u.business_id
            WHERE u.id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Screens: Business users can only access their business's screens
CREATE POLICY "Users can manage screens in their business"
    ON screens FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Screen Menu: Business users can only access their business's screen-menu relations
CREATE POLICY "Users can manage screen-menu relations in their business"
    ON screen_menu FOR ALL
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

-- ============================================
-- INITIAL DATA (Optional - for testing)
-- ============================================
-- Note: Super admin user should be created via Supabase Auth first,
-- then linked to a business or set role to 'super_admin'
