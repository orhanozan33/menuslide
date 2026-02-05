-- Super Admin kullanıcı oluştur (Supabase SQL Editor'de çalıştır)
-- E-posta: admin@menuslide.com | Şifre: orhanozan33

-- Önce businesses tablosunda bir kayıt olmalı (schema zaten ekler)
-- Super admin için business_id NULL olabilir

INSERT INTO users (email, password_hash, role, business_id)
VALUES (
  'admin@menuslide.com',
  '$2b$10$M3zOAslJGpbZQWtob.2ZJuHnNpK4BDKS4SNyMIZTY/1.0IGv5cINO',
  'super_admin',
  NULL
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'super_admin';
