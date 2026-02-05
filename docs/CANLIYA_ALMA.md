# Canlıya Alma – Sadece Bunlar (Yerel yok)

**Adım adım anlatım istiyorsan:** **docs/CANLIYA_ALMA_ADIM_ADIM.md** dosyasına bak.

Yerel PostgreSQL / localhost ile işin yok. Canlı: **Render (backend)** + **Vercel (frontend)** + **Supabase (veritabanı)**.

---

## 1. Render (Backend)

Render → Servis → **Environment** → **Bulk Edit** → aşağıdakini yapıştır. Sadece Stripe satırlarını kendi key’lerinle değiştir.

```
NODE_ENV=production
PORT=10000

DATABASE_URL=postgresql://postgres:orhanozan33@db.ibtnyekpnjpudjfwmzyc.supabase.co:5432/postgres
JWT_SECRET=S7zXm/8z8GCDeftmGUuBL0tx4CuROkjr/K31a9eqbrJrmsSfYUqMYHt+uul6xe5v56TLWKA96MPIyJe2+hVrJg==
SUPABASE_URL=https://ibtnyekpnjpudjfwmzyc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidG55ZWtwbmpwdWRqZndtenljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI2NTg3OSwiZXhwIjoyMDg1ODQxODc5fQ.n1_zQCWubP058Kx1DsEIHaKcfy_xwn_tRez9UduO6kA

CORS_ORIGIN=https://menuslide.com

STRIPE_SECRET_KEY=sk_test_XXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXX

ADMIN_EMAIL=orhanozan33@hotmail.com
```

Kaydet → **Manual Deploy**.

**Önemli:** `DATABASE_URL` mutlaka dolu olmalı. Yoksa backend localhost:5432’ye düşer ve canlıda hata alırsın.

---

## 2. Vercel (Frontend)

Vercel → Proje → **Settings** → **Environment Variables** → Production + Preview işaretli olsun.

```
NEXT_PUBLIC_SUPABASE_URL=https://ibtnyekpnjpudjfwmzyc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidG55ZWtwbmpwdWRqZndtenljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjU4NzksImV4cCI6MjA4NTg0MTg3OX0.oD-stc7cR45kwjgSGJRqZcNvnF7d3v0ePh0zSza7W54
NEXT_PUBLIC_API_URL=https://tvproje-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://menuslide.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXX
NEXT_PUBLIC_POLOTNO_KEY=
NEXT_PUBLIC_GRAPESJS_LICENSE_KEY=
```

Stripe publishable key’i doldur → Save → **Redeploy**.

---

## 3. Supabase – Giriş için kullanıcı (bir kez)

Supabase → **SQL Editor** → aşağıdaki iki sorguyu **sırayla** çalıştır.

**Sorgu 1 – `password_hash` sütunu:**
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;
```

**Sorgu 2 – Super admin (giriş: orhanozan33@hotmail.com / 33333333):**
```sql
INSERT INTO users (email, password_hash, role, business_id)
VALUES ('orhanozan33@hotmail.com', '$2b$10$3cWu7mcoMdWtHyQnQoEelu/NAuwEpXgiBUtn0BEEJgxM./se.rjou', 'super_admin', NULL)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'super_admin';
```

---

## Özet

| Nerede    | Ne yapıyorsun |
|-----------|----------------|
| **Render**  | Yukarıdaki env’leri yapıştır, Stripe’ı doldur, **Manual Deploy**. |
| **Vercel**   | Yukarıdaki env’leri yapıştır, Stripe’ı doldur, **Redeploy**. |
| **Supabase** | İki SQL’i çalıştır (password_hash + super admin). |

Giriş: **menuslide.com** → **orhanozan33@hotmail.com** / **33333333**.

Yerel .env / localhost ile uğraşmana gerek yok; canlıda sadece bu üç adım geçerli.
