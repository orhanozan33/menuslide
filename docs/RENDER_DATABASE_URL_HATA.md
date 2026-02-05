# Render: "DATABASE_URL is required in production" Hatası

Backend Render’da bu hata ile kapanıyorsa **Environment**’ta `DATABASE_URL` yok veya yanlış.

---

## Dikkat: Kaydettikten sonra mutlaka Manual Deploy

Env değişkenini ekledikten sonra **Save** deyip **hemen Manual Deploy** yap. Eski deploy env’i görmez.

---

## Hızlı çözüm (adımlar)

1. **https://dashboard.render.com** → giriş yap.
2. **tvproje-backend** (veya backend servis adın) → sol menü **Environment**.
3. **Add Environment Variable** veya **Bulk Edit** ile şunu ekle:

**Key:** `DATABASE_URL`  
**Value:** (aşağıdaki satırın tamamını kopyala, şifre doğruysa olduğu gibi yapıştır)

```
postgresql://postgres:orhanozan33@db.ibtnyekpnjpudjfwmzyc.supabase.co:5432/postgres
```

4. **Save Changes** (sayfanın üst/altındaki yeşil buton).
5. Listede **DATABASE_URL** göründüğünden emin ol (key tam: `DATABASE_URL`, büyük harf).
6. **Manual Deploy** tıkla (Deploy sekmesi veya sağ üst). Yeni deploy bittikten sonra log’ta hata olmamalı.

---

## Tüm env’leri toplu eklemek istersen

**Environment** sayfasında **Bulk Edit**’e tıkla, aşağıdaki blokun **tamamını** yapıştır (içinde `DATABASE_URL` de var):

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

Stripe key’lerini kendi değerlerinle değiştir → **Save Changes** → **Manual Deploy**.

---

**Not:** Supabase şifren farklıysa `DATABASE_URL` içindeki `orhanozan33` kısmını kendi veritabanı şifrenle değiştir (Supabase → Settings → Database → Database password).
