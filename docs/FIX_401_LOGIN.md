# 401 Unauthorized – Giriş Yapılamıyor (Render + Supabase)

`POST .../auth/login` **401** dönüyorsa backend, Supabase'deki `users` tablosunda bu e‑postayı bulamıyor veya şifre eşleşmiyor.

---

## Hızlı çözüm (Supabase'de seed çalıştır)

1. **Supabase Dashboard** → projeniz → **SQL Editor**.
2. Önce `password_hash` sütunu yoksa ekleyin (bir kez):

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;
```

3. Sonra super admin kullanıcıyı ekleyin/güncelleyin (dosya: `database/seed-super-admin.sql`):

```sql
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
```

4. **Run** ile çalıştırın.
5. Giriş: **orhanozan33@hotmail.com** / **33333333**

---

## Hâlâ 401 alıyorsan

- **E‑posta / şifre:** Tam olarak yukarıdaki gibi yazın (kopyala-yapıştır). Şifre: `33333333` (8 karakter).
- **Supabase bağlantısı:** Render’daki backend `.env` içinde `DATABASE_URL` Supabase Postgres’e işaret etmeli (Supabase → Settings → Database → Connection string).
- **Tablolar:** `users` tablosu `password_hash` sütununa sahip olmalı. Proje ilk kurulumda `database/supabase-sql-editor-full.sql` ile açıldıysa bu sütun zaten vardır.
