-- Add billing_interval to subscriptions (monthly/yearly)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (billing_interval IN ('monthly', 'yearly'));
