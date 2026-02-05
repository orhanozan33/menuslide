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
