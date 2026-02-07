-- Super admin: aynı TV linki birden fazla cihazda yayınlanabilsin
ALTER TABLE screens ADD COLUMN IF NOT EXISTS allow_multi_device BOOLEAN DEFAULT false;
COMMENT ON COLUMN screens.allow_multi_device IS 'true ise aynı link birden fazla cihazda açık olabilir (super_admin için)';
