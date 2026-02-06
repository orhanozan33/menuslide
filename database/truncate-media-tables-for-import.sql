-- Şablon, blok içerikleri ve kütüphane tablolarını temizler.
-- Böylece psql ile yapacağınız import'ta yerel veri (uploads path'li) gerçekten yazılır.
-- Dikkat: Bu tablolardaki mevcut Supabase verisi silinir.

TRUNCATE
  template_block_contents,
  template_blocks,
  templates,
  screen_block_contents,
  screen_blocks,
  screen_template_rotations,
  content_library,
  content_library_categories
RESTART IDENTITY CASCADE;
