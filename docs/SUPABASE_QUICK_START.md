# Supabase Hızlı Başlangıç

Bu rehber, projeyi Supabase ile çalıştırmak için gereken minimum adımları özetler.

## 1. Supabase Projesi

1. [Supabase Dashboard](https://app.supabase.com) → **New Project**
2. Proje adı, şifre ve region seçin
3. **Settings → API** → `Project URL`, `anon` key, `service_role` key not alın
4. **Settings → Database** → Connection string (URI, port **6543** pooler) kopyalayın

## 2. Veritabanı Şeması

Supabase SQL Editor'de sırayla çalıştırın:

1. `database/schema-local.sql`
2. `database/migrations/*.sql` (migrations klasöründeki dosyalar)
3. `database/migration-pricing-12-99-per-tv.sql` (veya güncel fiyatlandırma)
4. `database/migration-contact-info-home-channels.sql`

## 3. Backend Ortam Değişkenleri

`backend/.env` içinde:

```env
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000
# JWT_SECRET, Stripe vb. diğer değişkenler
```

## 4. Frontend Ortam Değişkenleri

`frontend/.env.local` içinde:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Çalıştırma

```bash
# Backend
cd backend && npm run start:dev

# Frontend
cd frontend && npm run dev
```

## İletişim Bilgisi ve Ana Sayfa Kanalları

- **contact_info**: Ayarlar → İletişim Bilgileri'nden girilen veriler artık Supabase `contact_info` tablosunda saklanır.
- **home_channels**: Ana sayfa kanalları `home_channels` tablosunda.
- Tablolar yoksa (migration çalışmamışsa) backend otomatik olarak `data/*.json` dosyalarına düşer (local fallback).
