-- Mevcut veritabanındaki Full Editor kategori seed verilerini siler.
-- Kafe, Maximalist, Modern, Profesyonel vb. admin tarafından kaydedilmemiş kategoriler kaldırılır.
-- full_editor_templates.category_id ON DELETE SET NULL olduğu için ilgili şablonlar etkilenmez, category_id null olur.

DELETE FROM full_editor_categories;
