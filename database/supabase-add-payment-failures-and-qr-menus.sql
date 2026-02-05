-- Supabase: payment_failures ve qr_menus tablolarını ekle (reports/payment-status ve qr-menus 500 hatası için)
-- SQL Editor’da bu dosyayı çalıştırın.

-- payment_failures
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

-- qr_menus + qr_menu_views + generate_qr_token
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
