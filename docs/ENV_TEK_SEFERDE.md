# Tüm Environment Variables – Tek Seferde

**Sadece canlıya alıyorsan:** yerel ile uğraşma → **docs/CANLIYA_ALMA.md** dosyasına bak (Render + Vercel + Supabase, tek sayfa).

Aşağıda hem canlı hem yerel için tüm env’ler var.

---

## 1) RENDER (Backend) – Hepsi tek blok

Render → Servis → **Environment** → **Bulk Edit** ile aşağıdaki blokun **tamamını** yapıştır.

**DATABASE_URL** aşağıda şifre ve port ile dolduruldu. Render’da yoğun trafik varsa port **6543** (pooler) kullan; normal kullanımda **5432** yeterli.

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

**Değiştir:** Sadece Stripe key'lerini kendi değerlerinle değiştir. Env’i kaydettikten sonra Render’da **Manual Deploy** yap.

---

## 2) VERCEL (Frontend) – Hepsi tek blok

Vercel → Proje → **Settings** → **Environment Variables** → **Add** veya toplu ekle. Production + Preview için işaretle.

```
NEXT_PUBLIC_SUPABASE_URL=https://ibtnyekpnjpudjfwmzyc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidG55ZWtwbmpwdWRqZndtenljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjU4NzksImV4cCI6MjA4NTg0MTg3OX0.oD-stc7cR45kwjgSGJRqZcNvnF7d3v0ePh0zSza7W54
NEXT_PUBLIC_API_URL=https://tvproje-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://menuslide.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXX
NEXT_PUBLIC_POLOTNO_KEY=
NEXT_PUBLIC_GRAPESJS_LICENSE_KEY=
```

**Değiştir:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Stripe’dan `pk_test_...` veya `pk_live_...`. Polotno kullanıyorsan key’i doldur.

---

## 3) Yerel backend (.env) – Tek seferde

Proje kökünde `backend/.env` dosyasına kopyala. Stripe ve DB parolasını kendi değerlerinle değiştir.

```
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://postgres:orhanozan33@db.ibtnyekpnjpudjfwmzyc.supabase.co:6543/postgres
JWT_SECRET=S7zXm/8z8GCDeftmGUuBL0tx4CuROkjr/K31a9eqbrJrmsSfYUqMYHt+uul6xe5v56TLWKA96MPIyJe2+hVrJg==
SUPABASE_URL=https://ibtnyekpnjpudjfwmzyc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidG55ZWtwbmpwdWRqZndtenljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjU4NzksImV4cCI6MjA4NTg0MTg3OX0.oD-stc7cR45kwjgSGJRqZcNvnF7d3v0ePh0zSza7W54
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidG55ZWtwbmpwdWRqZndtenljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI2NTg3OSwiZXhwIjoyMDg1ODQxODc5fQ.n1_zQCWubP058Kx1DsEIHaKcfy_xwn_tRez9UduO6kA

CORS_ORIGIN=http://localhost:3000

STRIPE_SECRET_KEY=sk_test_XXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXX

ADMIN_EMAIL=orhanozan33@hotmail.com
```

---

## Özet tablo

| Nerede | Ne |
|--------|-----|
| **Render** | Yukarıdaki 1) bloğu → Environment Variables. `PAROLA` ve Stripe key’lerini doldur. |
| **Vercel** | 2) bloğu → Environment Variables. Stripe publishable key’i doldur. Env değiştirdikten sonra **Redeploy**. |
| **Yerel backend** | 3) bloğu → `backend/.env`. Stripe ve DB parolası senin değerlerin. |

---

## Bağlantı / giriş sorunu varsa – Kontrol listesi

Kullanıcı giriş yapamıyorsa (401 veya “bağlantı yok”) sırayla şunları kontrol et:

### 1) Render – DATABASE_URL

- **Render** → servis → **Environment** → `DATABASE_URL` var mı?
- Değer şu formatta olmalı: `postgresql://postgres:orhanozan33@db.ibtnyekpnjpudjfwmzyc.supabase.co:5432/postgres` (port **5432** direkt bağlantı; istersen pooler için **6543** kullan).
- Env değiştirdiysen **Manual Deploy** yaptın mı?

### 2) Supabase – Giriş yapabilecek kullanıcı

- Backend girişi `users` tablosu + `password_hash` ile yapıyor. Bu kullanıcı Supabase’de yoksa 401 alırsın.
- **Supabase** → **SQL Editor** → şu iki sorguyu **sırayla** çalıştır (ayrıntı: `docs/FIX_401_LOGIN.md`):

```sql
-- 1) password_hash sütunu yoksa ekle
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- 2) Super admin ekle/güncelle (giriş: orhanozan33@hotmail.com / 33333333)
INSERT INTO users (email, password_hash, role, business_id)
VALUES ('orhanozan33@hotmail.com', '$2b$10$3cWu7mcoMdWtHyQnQoEelu/NAuwEpXgiBUtn0BEEJgxM./se.rjou', 'super_admin', NULL)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'super_admin';
```

### 3) Vercel – Backend adresi

- **Vercel** → Proje → **Settings** → **Environment Variables** → `NEXT_PUBLIC_API_URL` = `https://tvproje-backend.onrender.com` (sonda **/** yok).
- Değişkeni ekleyip/değiştirdikten sonra **Redeploy** yaptın mı?

### 4) CORS

- **Render** → Environment → `CORS_ORIGIN` = `https://menuslide.com` (sonda / yok). Site farklı domain’deyse (örn. `menuslide.vercel.app`) onu yazma; canlı domain’i yaz.

### 5) Hızlı test

- Tarayıcıda `https://tvproje-backend.onrender.com` açılıyor mu? (404 veya “Cannot GET /” normal; backend ayakta demektir.)
- Giriş: **orhanozan33@hotmail.com** / **33333333** (şifre 8 karakter, hepsi 3).

Hâlâ 401 alıyorsan Render **Logs**’a bak; veritabanı bağlantı hatası veya “Invalid credentials” satırı var mı kontrol et.

---

Bu dosyayı güvenlik için repo’da tutuyorsan **gerçek şifre ve Stripe secret key’leri** dokümana yazma; sadece Render/Vercel arayüzünde veya yerel `.env` içinde kullan (`.env` zaten `.gitignore`’da).
