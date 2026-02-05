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
