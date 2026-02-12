-- ============================================================
-- sistemtv@gmail.com kullanıcısının "Benim Şablonlarım" 
-- şablonlarını sistem şablonları olarak kopyalar.
-- Böylece Sistem > Şablonlar listesinde görünürler.
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → Bu dosyayı yapıştır → Run
-- ============================================================

INSERT INTO full_editor_templates (name, canvas_json, preview_image, category_id, created_by, sales, uses)
SELECT 
  name,
  canvas_json,
  preview_image,
  category_id,
  NULL,  -- created_by = NULL → sistem şablonu
  0,
  0
FROM full_editor_templates
WHERE created_by = (SELECT id FROM users WHERE email = 'sistemtv@gmail.com' LIMIT 1);
