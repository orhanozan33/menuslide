-- Paket durdurulduğunda admin tarafından girilen neden (ödeme alınamadı, üyelik sonlandırma vb.)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stop_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN subscriptions.stop_reason IS 'Paket admin tarafından durdurulduğunda neden: payment_not_received, membership_termination vb.';
COMMENT ON COLUMN subscriptions.stopped_at IS 'Paket durdurulma tarihi';
