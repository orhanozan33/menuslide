# Vercel + Supabase Deployment Guide

Bu rehber, Menu Slide projesini **Vercel** (frontend) ve **Supabase** (veritabanı) ile deploy etmek için gerekli adımları açıklar.

## Mimari Özet

- **Frontend (Next.js)**: Vercel'de host edilir
- **Backend (NestJS)**: Railway, Render veya Fly.io'da host edilir
- **Veritabanı**: Supabase PostgreSQL
- **Storage**: Supabase Storage (resimler/videolar için)

---

## 1. Supabase Kurulumu

### 1.1 Proje Oluşturma

1. [Supabase Dashboard](https://app.supabase.com) → **New Project**
2. Proje adı, şifre ve region seçin
3. **Settings → API** bölümünden şunları not alın:
   - `Project URL`
   - `anon` (public) key
   - `service_role` key

### 1.2 Veritabanı Şeması

1. Supabase SQL Editor'ü açın
2. Sırayla çalıştırın:
   - `database/schema-local.sql` veya Supabase auth kullanacaksanız `database/schema.sql`
   - `database/migrations/*.sql` dosyaları
   - `database/migration-pricing-*.sql` (varsa)
   - `database/migration-contact-info-home-channels.sql` (iletişim bilgisi + ana sayfa kanalları)

### 1.3 Storage Bucket

1. **Storage → New bucket** → `uploads` (public)
2. Gerekirse RLS politikalarını ayarlayın

### 1.4 Connection String

- **Settings → Database → Connection string** → URI (Transaction pooler, port 6543)
- Örnek: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

---

## 2. Backend Deployment (Railway / Render)

Backend NestJS uygulamasını Railway veya Render'da deploy edin.

### Railway

1. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Repo'yu seçin, **Root Directory**: `backend`
3. **Settings → Variables** ekleyin:

```
DATABASE_URL=postgresql://...  # Supabase connection string
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-vercel-app.vercel.app
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
```

4. **Build Command**: `npm run build`
5. **Start Command**: `npm run start:prod` veya `node dist/main`
6. Deploy sonrası **Backend URL**'i not alın (örn. `https://menuslide-api.up.railway.app`)

### Render

1. [Render](https://render.com) → **New → Web Service**
2. GitHub repo bağlayın, **Root Directory**: `backend`
3. **Environment** değişkenlerini ekleyin (yukarıdaki ile aynı)
4. **Build**: `npm install && npm run build`
5. **Start**: `npm run start:prod`

---

## 3. Vercel Deployment (Frontend)

### 3.1 Proje Ayarları

1. [Vercel](https://vercel.com) → **Add New Project**
2. GitHub repo'yu seçin
3. **Root Directory**: `frontend` olarak ayarlayın
4. **Framework Preset**: Next.js (otomatik algılanır)

### 3.2 Environment Variables

Vercel **Settings → Environment Variables** bölümüne ekleyin:

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-url.railway.app` | Backend API adresi |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_YOUR_KEY` | Stripe public key |
| `NEXT_PUBLIC_POLOTNO_KEY` | (opsiyonel) | Polotno API key |

### 3.3 Deploy

Deploy butonuna tıklayın. Build tamamlandıktan sonra frontend `https://your-app.vercel.app` adresinde yayında olacaktır.

### 3.4 CORS Güncellemesi

Backend `CORS_ORIGIN` değişkenine Vercel domain'inizi ekleyin:
```
CORS_ORIGIN=https://your-app.vercel.app,https://your-app-*.vercel.app
```

---

## 4. Next.js Image Optimization (Supabase Storage)

Supabase Storage'dan gelen resimleri `next/image` ile kullanacaksanız:

1. `frontend/next.config.js` içinde `images.domains` veya `images.remotePatterns` bölümüne Supabase hostname'inizi ekleyin:

```js
images: {
  domains: ['localhost', 'abcdefgh.supabase.co'],
}
```

(`abcdefgh` kısmını kendi Supabase project ref'inizle değiştirin)

---

## 5. İletişim Bilgisi ve Ana Sayfa Kanalları (Supabase)

Backend artık `contact_info` ve `home_channels` tablolarını kullanıyor. Supabase'e geçince:

- **contact_info**: Ayarlar'dan girilen e-posta, telefon, adres bu tabloda saklanır. Başlangıçta boş satır vardır.
- **home_channels**: Ana sayfa kanalları bu tabloda saklanır.

Mevcut JSON verilerinizi (data/contact-info.json, data/home-channels.json) taşımak isterseniz, Supabase SQL Editor'de manuel INSERT yapabilir veya Ayarlar üzerinden tekrar girebilirsiniz.

---

## 6. Kontrol Listesi

- [ ] Supabase projesi oluşturuldu
- [ ] Veritabanı şeması ve migrasyonlar çalıştırıldı (migration-contact-info-home-channels dahil)
- [ ] Storage bucket oluşturuldu
- [ ] Backend deploy edildi (Railway/Render)
- [ ] Backend env değişkenleri ayarlandı
- [ ] Vercel'de frontend deploy edildi
- [ ] Vercel env değişkenleri ayarlandı
- [ ] CORS_ORIGIN güncellendi
- [ ] Stripe webhook URL'i production backend'e ayarlandı

---

## 7. Sorun Giderme

**API bağlantı hatası**: `NEXT_PUBLIC_API_URL` doğru backend URL'ini gösteriyor mu kontrol edin.

**CORS hatası**: Backend `CORS_ORIGIN` değişkenine Vercel domain'inizi ekleyin.

**404 on /api routes**: Vercel otomatik olarak `app/api` route'larını tanır; `vercel.json` rewrite'ları gerekmez.
