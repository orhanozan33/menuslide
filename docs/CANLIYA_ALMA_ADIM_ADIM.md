# Canlıya Alma – Adım Adım

**Satır satır, tek tek ne yapacağını görmek istiyorsan:** **docs/CANLIYA_ALMA_SATIR_SATIR.md** dosyasına bak (50 satırlık sıralı liste).

Menuslide’ı canlıya almak için sırayla aşağıdaki adımları uygula. Yerel bilgisayar/PostgreSQL ile uğraşmana gerek yok.

---

## ADIM 1: Supabase’de giriş yapabilecek kullanıcıyı oluştur

Backend girişi Supabase’deki `users` tablosunu kullanıyor. Bu adımı **en başta** yap.

1. Tarayıcıda **https://supabase.com** aç, giriş yap.
2. **tvproje** (veya kullandığın) projesine tıkla.
3. Sol menüden **SQL Editor**’ü aç.
4. **New query** ile yeni sorgu aç.
5. Aşağıdaki **ilk** SQL’i yapıştır, **Run**’a bas:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;
```

6. Hata yoksa **ikinci** SQL’i aynı yerde (veya yeni sorguda) yapıştır, tekrar **Run**’a bas:

```sql
INSERT INTO users (email, password_hash, role, business_id)
VALUES ('orhanozan33@hotmail.com', '$2b$10$3cWu7mcoMdWtHyQnQoEelu/NAuwEpXgiBUtn0BEEJgxM./se.rjou', 'super_admin', NULL)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'super_admin';
```

7. Bitti. Canlıda giriş: **orhanozan33@hotmail.com** / **33333333**.

---

## ADIM 2: Render’da backend env’lerini ayarla

Backend Render’da çalışıyor. Env’ler olmazsa veritabanına bağlanamaz, giriş 401 verir.

1. Tarayıcıda **https://dashboard.render.com** aç, giriş yap.
2. **tvproje-backend** (veya backend servisinin adı) servisine tıkla.
3. Sol menüden **Environment**’ı seç.
4. **Bulk Edit** (veya tek tek **Add Environment Variable**) kullan.
5. Aşağıdaki **tüm satırları** kopyalayıp Environment alanına yapıştır:

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

6. **STRIPE_SECRET_KEY**, **STRIPE_WEBHOOK_SECRET**, **STRIPE_PUBLISHABLE_KEY** satırlarındaki `sk_test_XXXX` / `whsec_XXXX` / `pk_test_XXXX` kısımlarını Stripe Dashboard’dan aldığın gerçek key’lerle değiştir. Stripe kullanmıyorsan şimdilik bırakabilirsin.
7. **Save Changes**’e bas.
8. Üstte veya sağda **Manual Deploy** (veya **Deploy latest commit**) butonuna basıp deploy’u başlat.
9. Deploy bitene kadar bekle (birkaç dakika). **Logs**’ta hata yoksa backend ayakta demektir.

---

## ADIM 3: Vercel’de frontend env’lerini ayarla

Site (menuslide.com) Vercel’de çalışıyor. Bu env’ler olmazsa frontend backend’e istek atamaz.

1. Tarayıcıda **https://vercel.com** aç, giriş yap.
2. **menuslide** (veya frontend projesinin adı) projesine tıkla.
3. Üst menüden **Settings**’e gir.
4. Sol menüden **Environment Variables**’ı seç.
5. **Add** veya **Paste .env** ile aşağıdaki satırları **tek tek** veya toplu ekle:

```
NEXT_PUBLIC_SUPABASE_URL=https://ibtnyekpnjpudjfwmzyc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidG55ZWtwbmpwdWRqZndtenljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjU4NzksImV4cCI6MjA4NTg0MTg3OX0.oD-stc7cR45kwjgSGJRqZcNvnF7d3v0ePh0zSza7W54
NEXT_PUBLIC_API_URL=https://tvproje-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://menuslide.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXX
NEXT_PUBLIC_POLOTNO_KEY=
NEXT_PUBLIC_GRAPESJS_LICENSE_KEY=
```

6. Her satır için **Environment** kısmında **Production** (ve istersen **Preview**) işaretle, **Save** de.
7. **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** değerini Stripe’dan aldığın `pk_test_...` veya `pk_live_...` ile değiştir.
8. **Deployments** sekmesine geç. En üstteki (son) deployment’ın yanındaki **⋯** (üç nokta) → **Redeploy**’a tıkla. “Use existing Build Cache” istersen işaretleyebilirsin, **Redeploy** de.
9. Redeploy bitene kadar bekle.

---

## ADIM 4: Canlıda test et

1. Tarayıcıda **https://menuslide.com** (veya Vercel’deki production URL’i) aç.
2. Giriş / Login sayfasına git.
3. **E-posta:** orhanozan33@hotmail.com  
   **Şifre:** 33333333  
   ile giriş yap.
4. Giriş başarılıysa canlıya alma tamam.

---

## Sıra özeti

| Sıra | Nerede    | Ne yaptın |
|------|-----------|-----------|
| 1    | Supabase  | İki SQL çalıştırdın (password_hash + super admin). |
| 2    | Render    | Env’leri yapıştırdın, Stripe’ı doldurduk, Manual Deploy yaptın. |
| 3    | Vercel    | Env’leri ekledin, Stripe’ı doldurduk, Redeploy yaptın. |
| 4    | Tarayıcı | menuslide.com’da orhanozan33@hotmail.com / 33333333 ile giriş testi. |

Takıldığın adımı söylersen o adımı birlikte netleştirebiliriz.
