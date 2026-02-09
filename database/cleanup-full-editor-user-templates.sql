-- Admin/super_admin dışındaki kullanıcıların kaydettiği Full Editor şablonlarını siler.
-- Sadece super admin ve admin tarafından kaydedilen (created_by IS NULL) şablonlar kalır.
-- Çalıştırma: psql -U postgres -d tvproje -f database/cleanup-full-editor-user-templates.sql

DELETE FROM full_editor_templates WHERE created_by IS NOT NULL;
