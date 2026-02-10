-- TV uygulaması uzaktan sürüm yönetimi: min (zorunlu güncelleme), latest (önerilen)
-- Supabase: Dashboard > SQL Editor > bu dosyayı yapıştırıp Run.
ALTER TABLE tv_app_settings
  ADD COLUMN IF NOT EXISTS min_version_code INTEGER,
  ADD COLUMN IF NOT EXISTS latest_version_code INTEGER,
  ADD COLUMN IF NOT EXISTS latest_version_name TEXT;

COMMENT ON COLUMN tv_app_settings.min_version_code IS 'Bu sürüm kodunun altındaki uygulamalar güncelleme zorunlu uyarısı görür';
COMMENT ON COLUMN tv_app_settings.latest_version_code IS 'Sunucudaki en güncel APK versionCode';
COMMENT ON COLUMN tv_app_settings.latest_version_name IS 'Sunucudaki en güncel sürüm adı (örn. 1.2.0)';
