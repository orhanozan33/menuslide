-- Spaces'e yüklemen gereken slide görselleri listesi.
-- Supabase SQL Editor'de çalıştır. Sonuçtaki her satır = bir dosya: slides/{screen_id}/{template_id}.jpg

SELECT
  s.id AS screen_id,
  s.name AS screen_name,
  s.broadcast_code,
  r.template_id,
  r.full_editor_template_id,
  COALESCE(r.full_editor_template_id::text, r.template_id::text) AS template_id_for_path,
  r.display_duration
FROM screens s
JOIN screen_template_rotations r ON r.screen_id = s.id AND r.is_active = true
WHERE s.is_active = true
ORDER BY s.id, r.display_order;

-- Path örneği (tek bir ekran için):
-- screen_id = 'abc-123-def' ve template_id_for_path = 'tpl-456' ise
-- Spaces'e yükle: slides/abc-123-def/tpl-456.jpg
