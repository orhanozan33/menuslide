-- TV uygulaması ayarları (super admin sayfasından düzenlenir)
CREATE TABLE IF NOT EXISTS tv_app_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  api_base_url TEXT NOT NULL DEFAULT '',
  download_url TEXT NOT NULL DEFAULT '',
  watchdog_interval_minutes INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO tv_app_settings (id, api_base_url, download_url, watchdog_interval_minutes)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '', '/downloads/Menuslide.apk', 5)
ON CONFLICT (id) DO NOTHING;
