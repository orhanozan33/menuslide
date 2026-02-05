# Yapılanlar Sonrası – Kalan Adımlar

**Tamamlanan:** Supabase – `users` tablosunda super_admin (orhanozan33@hotmail.com) oluşturuldu.

**Heartbeat 500 veya 401 alıyorsan:** `database/supabase-fix-heartbeat-and-login.md` dosyasına bak (display_viewers tablosu + 401 kontrolü).

---

## KALAN ADIM 1: Render (Backend)

1. Tarayıcıda **https://dashboard.render.com** aç, giriş yap.
2. **tvproje-backend** servisine tıkla.
3. Sol menüden **Environment**’ı seç.
4. **Bulk Edit**’e tıkla, aşağıdaki **tümünü** yapıştır:

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

5. Stripe key’lerin varsa `sk_test_XXXX`, `whsec_XXXX`, `pk_test_XXXX` kısımlarını gerçek key’lerle değiştir.
6. **Save Changes** → **Manual Deploy**.
7. Deploy bitene kadar bekle; **Logs**’ta hata olmamalı.

---

## KALAN ADIM 2: Vercel (Frontend)

1. **https://vercel.com** aç, giriş yap.
2. **menuslide** (veya frontend projesi) projesine tıkla.
3. **Settings** → **Environment Variables**.
4. **Paste .env** veya **Add** ile aşağıdakini ekle (Production işaretli):

```
NEXT_PUBLIC_SUPABASE_URL=https://ibtnyekpnjpudjfwmzyc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidG55ZWtwbmpwdWRqZndtenljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjU4NzksImV4cCI6MjA4NTg0MTg3OX0.oD-stc7cR45kwjgSGJRqZcNvnF7d3v0ePh0zSza7W54
NEXT_PUBLIC_API_URL=https://tvproje-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://menuslide.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXX
NEXT_PUBLIC_POLOTNO_KEY=
NEXT_PUBLIC_GRAPESJS_LICENSE_KEY=
```

5. Stripe publishable key’in varsa `pk_test_XXXX` yerine gerçek key’i yaz.
6. **Save**.
7. **Deployments** → en son deployment → **⋯** → **Redeploy** → Redeploy onayı ver.
8. Redeploy bitene kadar bekle.

---

## KALAN ADIM 3: Test (Giriş)

1. **https://menuslide.com** aç.
2. **Giriş / Login** sayfasına git.
3. **E-posta:** orhanozan33@hotmail.com  
   **Şifre:** 33333333  
4. Giriş yap. Panele düşüyorsan canlıya alma tamam.

---

## Özet

| Sıra | Yapılacak        | Nerede   |
|------|------------------|----------|
| ✅   | ~~Supabase users~~ | ~~Tamamlandı~~ |
| 1    | Env + Manual Deploy | Render   |
| 2    | Env + Redeploy     | Vercel  |
| 3    | Giriş testi         | menuslide.com |

Bu üç adımı bitirince canlı ortam hazır olur.
