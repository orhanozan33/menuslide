-- ============================================
-- ENTERPRISE FEATURES SCHEMA
-- Template Marketplace, Franchise System, White-label & Reseller
-- ============================================

-- ============================================
-- 1. TEMPLATE MARKETPLACE
-- ============================================

-- Extend templates table for marketplace
ALTER TABLE templates 
  ADD COLUMN IF NOT EXISTS marketplace_status TEXT DEFAULT 'private' CHECK (marketplace_status IN ('private', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS designer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS designer_commission_percent DECIMAL(5, 2) DEFAULT 0 CHECK (designer_commission_percent >= 0 AND designer_commission_percent <= 100);

-- Template pricing
CREATE TABLE IF NOT EXISTS template_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    stripe_price_id TEXT UNIQUE, -- Stripe Price ID for one-time payment
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id)
);

-- Template purchases
CREATE TABLE IF NOT EXISTS template_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    purchase_price DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    purchased_at TIMESTAMP WITH TIME ZONE,
    license_type TEXT NOT NULL DEFAULT 'business' CHECK (license_type IN ('business', 'single_screen')),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for lifetime license
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template purchase revenue split
CREATE TABLE IF NOT EXISTS template_revenue_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES template_purchases(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('platform', 'designer', 'reseller')),
    recipient_id UUID, -- user_id for designer, reseller_id for reseller, NULL for platform
    amount DECIMAL(10, 2) NOT NULL,
    percent DECIMAL(5, 2) NOT NULL,
    stripe_transfer_id TEXT, -- For designer/reseller payouts
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'transferred', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for marketplace
CREATE INDEX IF NOT EXISTS idx_templates_marketplace_status ON templates(marketplace_status);
CREATE INDEX IF NOT EXISTS idx_templates_is_paid ON templates(is_paid);
CREATE INDEX IF NOT EXISTS idx_templates_designer_id ON templates(designer_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_business_id ON template_purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_template_id ON template_purchases(template_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_status ON template_purchases(status);
CREATE INDEX IF NOT EXISTS idx_template_revenue_splits_purchase_id ON template_revenue_splits(purchase_id);

-- ============================================
-- 2. FRANCHISE / HQ → BRANCH SYSTEM
-- ============================================

-- Extend businesses table for franchise hierarchy
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS parent_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_hq BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS franchise_code TEXT, -- Unique code for franchise chain
  ADD COLUMN IF NOT EXISTS hq_controlled BOOLEAN DEFAULT false; -- If true, HQ controls this branch

-- Template locks (HQ can lock templates for branches)
CREATE TABLE IF NOT EXISTS template_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, -- Branch business
    locked_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- HQ user
    lock_type TEXT NOT NULL CHECK (lock_type IN ('full', 'layout', 'colors', 'logo', 'content')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, business_id, lock_type)
);

-- Override rules (what branches can override)
CREATE TABLE IF NOT EXISTS override_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, -- Branch business
    rule_type TEXT NOT NULL CHECK (rule_type IN ('prices', 'descriptions', 'language', 'images', 'content')),
    can_override BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- HQ user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, rule_type)
);

-- HQ template assignments (HQ pushes templates to branches)
CREATE TABLE IF NOT EXISTS hq_template_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    hq_business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    branch_business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_required BOOLEAN DEFAULT false, -- Branch must use this template
    can_customize BOOLEAN DEFAULT true, -- Branch can customize (if override rules allow)
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, branch_business_id)
);

-- Indexes for franchise system
CREATE INDEX IF NOT EXISTS idx_businesses_parent_id ON businesses(parent_business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_is_hq ON businesses(is_hq);
CREATE INDEX IF NOT EXISTS idx_businesses_franchise_code ON businesses(franchise_code);
CREATE INDEX IF NOT EXISTS idx_template_locks_business_id ON template_locks(business_id);
CREATE INDEX IF NOT EXISTS idx_template_locks_template_id ON template_locks(template_id);
CREATE INDEX IF NOT EXISTS idx_override_rules_business_id ON override_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_hq_template_assignments_branch_id ON hq_template_assignments(branch_business_id);
CREATE INDEX IF NOT EXISTS idx_hq_template_assignments_hq_id ON hq_template_assignments(hq_business_id);

-- ============================================
-- 3. WHITE-LABEL & RESELLER SYSTEM
-- ============================================

-- Extend users table for reseller role
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL;

-- Resellers table
CREATE TABLE IF NOT EXISTS resellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    commission_percent DECIMAL(5, 2) DEFAULT 10.0 CHECK (commission_percent >= 0 AND commission_percent <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- White-label settings per reseller
CREATE TABLE IF NOT EXISTS whitelabel_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    custom_domain TEXT UNIQUE, -- e.g., "menu.example.com"
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6', -- Hex color
    secondary_color TEXT DEFAULT '#1E40AF',
    login_background_image_url TEXT,
    login_title TEXT DEFAULT 'Digital Menu Management',
    login_subtitle TEXT,
    remove_platform_branding BOOLEAN DEFAULT false,
    custom_css TEXT, -- Additional CSS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reseller_id)
);

-- Reseller customers (businesses created by reseller)
CREATE TABLE IF NOT EXISTS reseller_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

-- Reseller commissions (earnings from customer subscriptions)
CREATE TABLE IF NOT EXISTS reseller_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    customer_business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    commission_percent DECIMAL(5, 2) NOT NULL,
    base_amount DECIMAL(10, 2) NOT NULL, -- Original payment amount
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    stripe_transfer_id TEXT, -- Stripe transfer ID for payout
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extend businesses for white-label
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whitelabel_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Indexes for reseller system
CREATE INDEX IF NOT EXISTS idx_users_reseller_id ON users(reseller_id);
CREATE INDEX IF NOT EXISTS idx_resellers_slug ON resellers(slug);
CREATE INDEX IF NOT EXISTS idx_reseller_customers_reseller_id ON reseller_customers(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_customers_business_id ON reseller_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_reseller_id ON reseller_commissions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_status ON reseller_commissions(status);
CREATE INDEX IF NOT EXISTS idx_businesses_reseller_id ON businesses(reseller_id);
CREATE INDEX IF NOT EXISTS idx_whitelabel_settings_domain ON whitelabel_settings(custom_domain);

-- ============================================
-- 4. TRIGGERS
-- ============================================

CREATE TRIGGER update_template_prices_updated_at BEFORE UPDATE ON template_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_purchases_updated_at BEFORE UPDATE ON template_purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_revenue_splits_updated_at BEFORE UPDATE ON template_revenue_splits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_locks_updated_at BEFORE UPDATE ON template_locks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_override_rules_updated_at BEFORE UPDATE ON override_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON resellers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whitelabel_settings_updated_at BEFORE UPDATE ON whitelabel_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reseller_commissions_updated_at BEFORE UPDATE ON reseller_commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to check if business owns template (purchased or created)
CREATE OR REPLACE FUNCTION business_owns_template(
  p_business_id UUID,
  p_template_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM templates t
    WHERE t.id = p_template_id
      AND (
        (t.business_id = p_business_id AND t.scope = 'user')
        OR EXISTS (
          SELECT 1 FROM template_purchases tp
          WHERE tp.template_id = p_template_id
            AND tp.business_id = p_business_id
            AND tp.status = 'completed'
            AND (tp.expires_at IS NULL OR tp.expires_at > NOW())
        )
        OR (t.scope = 'system' AND t.is_paid = false)
      )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if branch can override field
CREATE OR REPLACE FUNCTION branch_can_override(
  p_business_id UUID,
  p_rule_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM override_rules
    WHERE business_id = p_business_id
      AND rule_type = p_rule_type
      AND can_override = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get HQ business for a branch
CREATE OR REPLACE FUNCTION get_hq_business(
  p_business_id UUID
) RETURNS UUID AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT parent_business_id INTO v_parent_id
  FROM businesses
  WHERE id = p_business_id;
  
  IF v_parent_id IS NULL THEN
    RETURN p_business_id; -- This is the HQ
  ELSE
    RETURN get_hq_business(v_parent_id); -- Recursive call
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. COMMENTS
-- ============================================
COMMENT ON TABLE template_prices IS 'Pricing for marketplace templates';
COMMENT ON TABLE template_purchases IS 'Template purchase records with Stripe integration';
COMMENT ON TABLE template_revenue_splits IS 'Revenue distribution for template purchases (platform, designer, reseller)';
COMMENT ON TABLE template_locks IS 'HQ can lock template aspects for branches';
COMMENT ON TABLE override_rules IS 'Rules defining what branches can override';
COMMENT ON TABLE hq_template_assignments IS 'HQ-assigned templates to branches';
COMMENT ON TABLE resellers IS 'Reseller/dealer accounts';
COMMENT ON TABLE whitelabel_settings IS 'White-label branding settings per reseller';
COMMENT ON TABLE reseller_customers IS 'Businesses assigned to resellers';
COMMENT ON TABLE reseller_commissions IS 'Commission tracking for resellers';
