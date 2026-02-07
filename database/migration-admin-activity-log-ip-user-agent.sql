-- Admin hareket loguna IP adresi ve tarayıcı bilgisi ekle (giriş/oturum takibi)
ALTER TABLE admin_activity_log ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE admin_activity_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

COMMENT ON COLUMN admin_activity_log.ip_address IS 'İşlem yapıldığında adminin IP adresi';
COMMENT ON COLUMN admin_activity_log.user_agent IS 'İşlem yapıldığında kullanılan tarayıcı (User-Agent)';
