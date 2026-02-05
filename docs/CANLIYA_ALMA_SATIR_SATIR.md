# Canlıya Alma – Satır Satır, Sırasıyla

Aşağıdaki satırları **sırayla** uygula. Bir satırı yaptıktan sonra bir sonrakine geç.

---

## BÖLÜM A: SUPABASE

**Satır 1.** Tarayıcıyı aç (Chrome, Safari vb.).

**Satır 2.** Adres çubuğuna şunu yaz: `https://supabase.com`

**Satır 3.** Enter’a bas.

**Satır 4.** Supabase’e giriş yap (e‑posta / şifre veya GitHub vb.).

**Satır 5.** Açılan listede **tvproje** (veya kendi projen) adlı projeye tıkla.

**Satır 6.** Sol taraftaki menüden **SQL Editor** yazısına tıkla.

**Satır 7.** Sağ üstte **New query** butonuna tıkla.

**Satır 8.** Açılan büyük metin kutusuna aşağıdaki **ilk** SQL’i yapıştır (Ctrl+V / Cmd+V):

```
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;
```

**Satır 9.** Sayfada **Run** (veya **Execute**) butonuna bas.

**Satır 10.** Altta “Success” veya yeşil onay görünce devam et. Hata varsa bu dosyayı kapatmadan bana yaz.

**Satır 11.** Aynı metin kutusundaki SQL’i **tamamen sil** (Ctrl+A → Delete veya hepsini seçip sil).

**Satır 12.** Şu **ikinci** SQL’i yapıştır:

```
INSERT INTO users (email, password_hash, role, business_id)
VALUES ('orhanozan33@hotmail.com', '$2b$10$3cWu7mcoMdWtHyQnQoEelu/NAuwEpXgiBUtn0BEEJgxM./se.rjou', 'super_admin', NULL)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'super_admin';
```

**Satır 13.** Tekrar **Run** butonuna bas.

**Satır 14.** Altta yine “Success” veya onay gör. Supabase bölümü bitti.

---

## BÖLÜM B: RENDER

**Satır 15.** Yeni bir sekme aç (Ctrl+T / Cmd+T).

**Satır 16.** Adres çubuğuna yaz: `https://dashboard.render.com`

**Satır 17.** Enter’a bas.

**Satır 18.** Render’a giriş yap.

**Satır 19.** Listede **tvproje-backend** (veya backend servisinin adı) satırına tıkla.

**Satır 20.** Sol menüden **Environment**’a tıkla.

**Satır 21.** Sayfada **Bulk Edit** butonuna tıkla (bazen “Edit” veya “Add Environment Variable” yanında olur).

**Satır 22.** Açılan büyük kutuya aşağıdaki **tüm satırları** (başında sonunda boşluk kalmadan) yapıştır:

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

**Satır 23.** Stripe key’lerin varsa: `sk_test_XXXX`, `whsec_XXXX`, `pk_test_XXXX` yazan yerleri kendi key’lerinle değiştir. Yoksa bu satırı atla, olduğu gibi bırak.

**Satır 24.** **Save Changes** butonuna bas.

**Satır 25.** Sayfanın üstünde veya sağında **Manual Deploy** (veya **Deploy latest commit**) butonuna bas.

**Satır 26.** Deploy’un bitmesini bekle (birkaç dakika). **Logs** sekmesinden “Listening on port…” veya benzeri bir satır görürsen backend ayağa kalkmış demektir. Render bölümü bitti.

---

## BÖLÜM C: VERCEL

**Satır 27.** Yeni bir sekme aç.

**Satır 28.** Adres çubuğuna yaz: `https://vercel.com`

**Satır 29.** Enter’a bas.

**Satır 30.** Vercel’e giriş yap.

**Satır 31.** **menuslide** (veya frontend projenin adı) projesine tıkla.

**Satır 32.** Üst menüden **Settings**’e tıkla.

**Satır 33.** Sol menüden **Environment Variables**’a tıkla.

**Satır 34.** **Paste .env** veya **Add** butonuna tıkla (toplu yapıştırma varsa “Paste .env” kullan).

**Satır 35.** Aşağıdaki **tüm satırları** yapıştır:

```
NEXT_PUBLIC_SUPABASE_URL=https://ibtnyekpnjpudjfwmzyc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidG55ZWtwbmpwdWRqZndtenljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjU4NzksImV4cCI6MjA4NTg0MTg3OX0.oD-stc7cR45kwjgSGJRqZcNvnF7d3v0ePh0zSza7W54
NEXT_PUBLIC_API_URL=https://tvproje-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://menuslide.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXX
NEXT_PUBLIC_POLOTNO_KEY=
NEXT_PUBLIC_GRAPESJS_LICENSE_KEY=
```

**Satır 36.** Her değişken için **Production** kutusunu işaretle (Preview isteğe bağlı).

**Satır 37.** **Save** butonuna bas.

**Satır 38.** Stripe publishable key’in varsa `pk_test_XXXX` yazan değeri kendi `pk_test_...` veya `pk_live_...` ile değiştir. Yoksa atla.

**Satır 39.** Üst menüden **Deployments** sekmesine tıkla.

**Satır 40.** En üstteki (en son) deployment’ın sağındaki **üç nokta (⋯)** menüsüne tıkla.

**Satır 41.** Açılan menüden **Redeploy**’a tıkla.

**Satır 42.** Onay penceresinde tekrar **Redeploy**’a bas.

**Satır 43.** Redeploy bitene kadar bekle. Vercel bölümü bitti.

---

## BÖLÜM D: TEST

**Satır 44.** Yeni sekmede adres çubuğuna yaz: `https://menuslide.com`

**Satır 45.** Enter’a bas.

**Satır 46.** Sitede **Giriş** / **Login** linkine tıkla.

**Satır 47.** E‑posta kutusuna yaz: `orhanozan33@hotmail.com`

**Satır 48.** Şifre kutusuna yaz: `33333333`

**Satır 49.** Giriş butonuna bas.

**Satır 50.** Panele veya ana sayfaya düştüysen canlıya alma tamamlandı.

---

## Özet (sıra)

| Sıra  | Satırlar   | Nerede   | Ne yaptın                          |
|-------|------------|----------|------------------------------------|
| 1.    | 1–14       | Supabase | İki SQL çalıştırdın.               |
| 2.    | 15–26      | Render   | Env’leri yapıştırdın, deploy ettin. |
| 3.    | 27–43      | Vercel   | Env’leri yapıştırdın, redeploy ettin. |
| 4.    | 44–50      | Tarayıcı | menuslide.com’da giriş testi.      |

Takıldığın satır numarasını yazarsan, o satırı birlikte netleştiririz.
