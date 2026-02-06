-- Supabase'de canlı veri teşhisi
-- SQL Editor'da veya: psql ... -f database/supabase-diagnostic-row-counts.sql

SELECT 'users' AS tablo, COUNT(*) AS adet FROM users
UNION ALL SELECT 'businesses', COUNT(*) FROM businesses
UNION ALL SELECT 'templates', COUNT(*) FROM templates
UNION ALL SELECT 'template_blocks', COUNT(*) FROM template_blocks
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'screens', COUNT(*) FROM screens
UNION ALL SELECT 'content_library', COUNT(*) FROM content_library
UNION ALL SELECT 'menus', COUNT(*) FROM menus;

-- Sistem şablonları (Hazır Şablonlar sayfası)
SELECT 'system_templates' AS info, COUNT(*) AS adet
FROM templates WHERE scope = 'system' AND is_active = true;
