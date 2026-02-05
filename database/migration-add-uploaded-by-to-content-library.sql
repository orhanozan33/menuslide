-- Kullanıcı yüklemelerini takip etmek için uploaded_by kolonu
ALTER TABLE content_library 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_library_uploaded_by ON content_library(uploaded_by);

COMMENT ON COLUMN content_library.uploaded_by IS 'Bu içeriği yükleyen kullanıcı (NULL = admin/sistem)';
