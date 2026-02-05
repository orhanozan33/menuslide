# Canlı Stack: GitHub + Supabase + Vercel + Render

Yerelde çalışmıyorsunuz; canlıda kullandıklarınız:

| Servis    | Rol              | URL örneği |
|-----------|------------------|------------|
| **GitHub**   | Kod deposu        | repo’nuz |
| **Supabase** | Veritabanı (PostgreSQL) | `*.supabase.co` |
| **Vercel**   | Frontend (Next.js) | https://menuslide.com |
| **Render**   | Backend (NestJS)  | https://tvproje-backend.onrender.com |

---

## 1. Supabase (veritabanı)

- **Dashboard:** https://supabase.com/dashboard → projeniz → **SQL Editor**
- **Connection string:** Project Settings → Database → “Connection string” (URI, pooler için port **6543** kullanın).

### SQL’leri sırayla çalıştırın (bir kez)

1. **supabase-ensure-columns-before-import.sql**  
   Tablolar/kolonlar, `payment_failures`, `qr_menus`, `home_channels`, fonksiyonlar.

2. **export-from-local-data.sql**  
   Ana veri (businesses, users, menus, screens, templates, vb.).

3. **supabase-add-get-active-menu-function.sql**  
   (Ensure-columns’ta varsa atlayın.) `get_active_menu_for_screen`, `check_screen_limit`.

4. **supabase-add-payment-failures-and-qr-menus.sql**  
   (Ensure-columns’ta bu tablolar yoksa.) `payment_failures`, `qr_menus`, `qr_menu_views`, `generate_qr_token`.

5. **supabase-seed-empty-tables.sql**  
   `home_channels`, `menu_item_translations`, `menu_schedules`, `payments`, `screen_block_contents`, `qr_menus` doldurur.

Dosyalar: `database/` klasöründe.

---

## 2. Render (backend)

- **Dashboard:** https://dashboard.render.com → Web Service (backend).
- **Build:** GitHub’a push = otomatik deploy (veya manuel Deploy).
- **Root directory:** `backend` (repo kökü değil).

### Ortam değişkenleri (Environment)

| Değişken | Açıklama |
|----------|----------|
| `NODE_ENV` | `production` |
| `PORT` | Render atar (genelde 10000). |
| `DATABASE_URL` | Supabase connection string (port **6543** – pooler). |
| `CORS_ORIGIN` | `https://menuslide.com` (sonda `/` yok). |
| `JWT_SECRET` | En az 32 karakter, güçlü rastgele. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key. |
| `STRIPE_*` | Canlı için `sk_live_...`, `pk_live_...`, `whsec_...`. |

İlk canlı veri aktarımı için (isteğe bağlı, **bir kez**):

- `ONE_TIME_IMPORT=1`  
- Render’ın `backend` root’undan `../database` erişilebiliyor olmalı (repo’da `database/` var).

---

## 3. Vercel (frontend)

- **Dashboard:** https://vercel.com → projeniz.
- **Build:** GitHub’a push = otomatik deploy.

### Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | `https://tvproje-backend.onrender.com` (sonda `/` yok). |
| `NEXT_PUBLIC_APP_URL` | `https://menuslide.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Canlı: `pk_live_...` |

---

## 4. GitHub

- Repo’yu push’ladığınızda:
  - **Vercel** frontend’i deploy eder.
  - **Render** backend’i deploy eder (repo bağlıysa).
- Şube: genelde `main` (veya Vercel/Render’da seçtiğiniz branch).

---

## Hızlı kontrol

- **Frontend:** https://menuslide.com açılıyor mu?
- **Backend:** https://tvproje-backend.onrender.com (veya health endpoint) yanıt veriyor mu?
- **DB:** Supabase SQL Editor’da `SELECT COUNT(*) FROM businesses;` gibi sorgular çalışıyor mu?
- **Giriş:** Canlı frontend’ten login; backend `CORS_ORIGIN` ve `DATABASE_URL` doğruysa çalışır.
- **Editor (react-konva):** Next 14 + transpilePackages ile deploy edildiyse ReactCurrentBatchConfig hatası kaybolur; Vercel’de “Clear cache and redeploy” deneyin.

---

## Dosya yolları (özet)

- SQL: `database/supabase-*.sql`, `database/export-from-local-data.sql`
- Backend env örneği: `backend/.env.example`
- Frontend env örneği: `frontend/.env.example`
- Detay: `docs/RENDER_ENV_AYARLARI.md`, `docs/VERCEL_ENV_GIRIS_TV.md`, `docs/BIR_KERELIK_IMPORT_CANLI.md`
