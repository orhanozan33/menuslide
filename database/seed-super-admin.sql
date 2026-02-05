-- Super Admin: orhanozan33@hotmail.com / şifre: 33333333
-- Supabase SQL Editor veya local PostgreSQL'de çalıştır.

INSERT INTO users (email, password_hash, role, business_id)
VALUES (
  'orhanozan33@hotmail.com',
  '$2b$10$3cWu7mcoMdWtHyQnQoEelu/NAuwEpXgiBUtn0BEEJgxM./se.rjou',
  'super_admin',
  NULL
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'super_admin';
