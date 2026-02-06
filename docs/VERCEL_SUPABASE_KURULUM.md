# Vercel + Supabase — Tam Kurulum Rehberi

Bu rehber, sistemi **sadece Vercel + Supabase** ile ayağa kaldırmanız için gerekli tüm adımları içerir. Render veya yerel backend gerekmez.

---

## 1. Supabase Projesi

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New Project** (veya mevcut proje: `ibtnyekpnjpudjfwmzyc`).
2. **Settings → API** şunları not edin:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (gizli tutun)

### 1.1 Veritabanı şeması

Supabase **SQL Editor**'de aşağıdaki sırayla çalıştırın. Detaylı liste: `database/SUPABASE_MIGRATION_SIRASI.md`.

| Sıra | Dosya |
|------|--------|
| 1 | `database/schema-local.sql` |
| 2 | `database/templates-schema.sql` |
| 3 | `database/template-block-contents-schema.sql` |
| 4 | `database/template-editor-schema.sql` |
| 5 | `database/text-content-schema.sql` |
| 6 | `database/migration-create-content-library.sql` |
| 7 | `database/SUPABASE_MIGRATION_SIRASI.md` içindeki migration-add-* listesi |
| 8 | `database/migrations/*.sql` |
| 9 | `database/migration-contact-info-home-channels.sql` |
| 10 | `database/supabase-add-get-active-menu-function.sql` |
| 11 | `database/supabase-add-payment-failures-and-qr-menus.sql` (varsa) |

### 1.2 Storage bucket (resim/video)

1. **Storage → New bucket** → İsim: **menuslide**
2. Bucket'ı **Public** yapın (resim/video URL'leri doğrudan açılsın).
3. Gerekirse **Policies** ile "Allow public read" ekleyin.

Detay: `docs/SUPABASE_STORAGE_MENUSLIDE.md`

### 1.3 İlk kullanıcı (Super Admin)

1. **Authentication → Users** → **Add user** (email + şifre).
2. Oluşan **User UID**'yi kopyalayın.
3. **SQL Editor**'de:

```sql
-- users tablosuna ekleyin (schema-local.sql'deki users yapısına uygun)
INSERT INTO users (id, email, role, business_id)
VALUES ('BURAYA_USER_UID', 'admin@example.com', 'super_admin', NULL)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

Şifre hash'i Auth tarafında Supabase'de tutulur; giriş **Authentication** ile yapılır.

---

## 2. Vercel Ortam Değişkenleri

Vercel Dashboard → Projeniz → **Settings → Environment Variables**. Aşağıdakileri **Production** (ve isterseniz Preview) için ekleyin.

| Değişken | Değer | Zorunlu |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Evet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Evet |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | Evet |
| `JWT_SECRET` | En az 32 karakter rastgele string | Evet |
| `NEXT_PUBLIC_API_URL` | **Boş bırakın** (Vercel API kullanılır) | Evet |
| `NEXT_PUBLIC_APP_URL` | Canlı site: `https://menuslide.com` veya `https://xxx.vercel.app` | Evet |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe pk_test_... / pk_live_... | Ödeme için |
| `STRIPE_SECRET_KEY` | Stripe sk_test_... / sk_live_... | Ödeme için |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook whsec_... | Webhook için |
| `NEXT_PUBLIC_POLOTNO_KEY` | Polotno API key | İsteğe bağlı |
| `NEXT_PUBLIC_GRAPESJS_LICENSE_KEY` | GrapesJS lisans | İsteğe bağlı |

**Önemli:** `NEXT_PUBLIC_API_URL` boş olmalı; böylece tüm API istekleri Vercel'deki `/api/proxy` ve ilgili route'lar üzerinden Supabase'e gider.

Değişkenleri ekledikten sonra **Redeploy** yapın.

---

## 3. Yerel Geliştirme (sistem ayağa kalksın)

### 3.1 Ortam dosyası

```bash
cd frontend
cp .env.example .env.local
```

`.env.local` içini doldurun (Supabase URL, anon key, service_role key, JWT_SECRET; `NEXT_PUBLIC_API_URL` boş).

### 3.2 Bağımlılıklar ve çalıştırma

```bash
# Proje kökünden
./scripts/start-vercel-frontend.sh
```

veya:

```bash
cd frontend
npm install
npm run dev
```

Tarayıcıda: **http://localhost:3000**

- Giriş: Supabase Auth'da oluşturduğunuz kullanıcı.
- TV yayını: Bir ekran oluşturup **Public URL** (örn. `/display/TOKEN`) ile açın.

### 3.3 Eski mod (Backend + Frontend)

Render/yerel backend kullanacaksanız:

- `NEXT_PUBLIC_API_URL=http://localhost:3001` (veya Render URL) yazın.
- Backend'i ayrıca başlatın: `./scripts/start-system.sh`

---

## 4. Özet Kontrol Listesi

- [ ] Supabase projesi oluşturuldu, API anahtarları alındı.
- [ ] Veritabanı şeması ve migration'lar SQL Editor'de çalıştırıldı.
- [ ] `get_active_menu_for_screen` fonksiyonu eklendi (public TV ekranı için).
- [ ] Storage bucket **menuslide** oluşturuldu ve **public** yapıldı.
- [ ] En az bir kullanıcı Auth'da oluşturuldu ve `users` tablosunda `super_admin` olarak işlendi.
- [ ] Vercel'de tüm ortam değişkenleri tanımlandı, `NEXT_PUBLIC_API_URL` boş.
- [ ] Vercel'de Redeploy yapıldı.
- [ ] Yerel test: `./scripts/start-vercel-frontend.sh` → http://localhost:3000 açılıyor, giriş yapılabiliyor.

Bu adımlarla sistem tamamen Vercel + Supabase üzerinde çalışır.
