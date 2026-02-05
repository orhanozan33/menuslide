# Render – Environment Variables (Backend)

Render Dashboard → **tvproje-backend** (veya servis adın) → **Environment** → aşağıdaki değişkenleri ekle/güncelle.

---

## Zorunlu (canlı için)

| Key | Value | Not |
|-----|--------|-----|
| `NODE_ENV` | `production` | Sabit böyle olsun. |
| `PORT` | `10000` | Render’da çoğu zaman otomatik atanır; servis “Web Service” ise bırak veya 10000 yaz. |
| `DATABASE_URL` | `postgresql://postgres:SIFRE@db.XXXX.supabase.co:6543/postgres` | Supabase → Settings → Database → **Connection string** → **URI** → **Mode: Transaction** (port **6543** pooler). `SIFRE` ve `XXXX` kendi projen. |
| `JWT_SECRET` | En az 32 karakter rastgele string | Örn. `openssl rand -base64 32` ile üret. Aynı değeri her deploy’da kullan. |
| `SUPABASE_URL` | `https://XXXX.supabase.co` | Supabase → Settings → API → Project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase → Settings → API → **service_role** (secret). |
| `CORS_ORIGIN` | `https://menuslide.com` | **Sonda slash (/) olmasın.** Canlı frontend adresi. Vercel custom domain menuslide.com ise bu olmalı; `menuslide.vercel.app` değil. |
| `STRIPE_SECRET_KEY` | `sk_test_...` veya `sk_live_...` | Stripe Dashboard’dan. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe webhook oluşturduğunda verilen secret. |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` veya `pk_live_...` | Stripe Dashboard’dan. |
| `ADMIN_EMAIL` | Gerçek e-posta | Örn. `orhanozan33@hotmail.com`. Ödeme hatalarında bildirim vb. için. |

---

## Özet (kopyala–yapıştır için isimler)

```
NODE_ENV=production
PORT=10000

DATABASE_URL=postgresql://postgres:SIFRE@db.XXXX.supabase.co:6543/postgres
JWT_SECRET=buraya_32_karakter_ve_uzunu_guclu_bir_anahtar_yaz
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

CORS_ORIGIN=https://menuslide.com

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

ADMIN_EMAIL=orhanozan33@hotmail.com
```

---

## Senin listende düzeltilmesi gerekenler

1. **`CORS_ORIGIN`**  
   - Yanlış: `https://menuslide.vercel.app`  
   - Doğru: **`https://menuslide.com`** (canlı domain; sonda `/` yok).

2. **`ADMIN_EMAIL`**  
   - `admin@example.com` yerine kendi e-postanı yaz (örn. `orhanozan33@hotmail.com`).

3. **`DATABASE_URL`**  
   - Supabase pooler için port **6543** kullan (senin örnekte doğru).  
   - Host: `db.XXXX.supabase.co` veya `aws-0-XX.pooler.supabase.com` (Supabase’in verdiği Connection string’i aynen kopyala).

4. **`JWT_SECRET`**  
   - Gerçekten 32+ karakter rastgele bir değer olmalı; “buraya_32_karakter_ve_uzunu_yaz” gibi placeholder kullanma.

Bunlara göre Render’daki env’leri güncelle; özellikle **CORS_ORIGIN** ve **JWT_SECRET** canlı giriş ve güvenlik için önemli.
