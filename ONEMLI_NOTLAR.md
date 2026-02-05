# ⚠️ ÖNEMLİ NOTLAR

## 🔴 Backend Çalışmıyor - Supabase URL Eksik

Backend loglarında şu hata var:
```
Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

## ✅ Çözüm

### 1. Supabase Projesi Oluştur
1. https://app.supabase.com → Giriş yap
2. **New Project** tıkla
3. Database Password: `333333`
4. Proje oluştur (2-3 dakika sürebilir)

### 2. API Anahtarlarını Al
1. Supabase Dashboard > **Settings** > **API**
2. Şunları kopyala:
   - **Project URL** (örn: `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (gizli tut!)

### 3. Environment Dosyalarını Güncelle

**backend/.env** dosyasını düzenle:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**frontend/.env.local** dosyasını düzenle:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Veritabanı Schema'sını Çalıştır
1. Supabase Dashboard > **SQL Editor**
2. `database/schema.sql` dosyasını çalıştır
3. `database/migrations/add_advanced_features.sql` çalıştır
4. `database/migrations/add_tv_ui_customization.sql` çalıştır

### 5. Super Admin Oluştur
1. **Authentication** > **Users** > **Add User**
   - Email: `orhan@example.com`
   - Password: `33333333`
   - Auto Confirm: ✅
2. UUID'yi kopyala
3. SQL Editor'de:
```sql
INSERT INTO users (id, email, role) 
VALUES ('UUID_BURAYA', 'orhan@example.com', 'super_admin');
```

### 6. Backend'i Yeniden Başlat
```bash
./scripts/stop-all-node.sh
./scripts/start-clean.sh
```

## 📊 Mevcut Durum

- ✅ Frontend çalışıyor: http://localhost:3000
- ❌ Backend çalışmıyor: Supabase URL eksik
- ✅ Node süreçleri durduruldu
- ✅ Sistem temiz başlatıldı

## 🎯 Sonraki Adımlar

1. Supabase projesi oluştur
2. Environment dosyalarını güncelle
3. Schema'yı çalıştır
4. Super admin oluştur
5. Sistemi yeniden başlat
