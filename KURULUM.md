# 🚀 Hızlı Kurulum Rehberi

## ÖNEMLİ: Bu Sistem Supabase Kullanıyor

Bu sistem yerel PostgreSQL değil, **Supabase** (cloud PostgreSQL) kullanıyor.

## Adımlar:

### 1️⃣ Supabase Projesi Oluştur
1. https://app.supabase.com → New Project
2. Database Password: `333333`
3. Proje oluşturulduktan sonra Settings > API'den anahtarları kopyala

### 2️⃣ Veritabanı Schema'sını Çalıştır
1. Supabase Dashboard > SQL Editor
2. `database/schema.sql` dosyasını çalıştır
3. `database/migrations/add_advanced_features.sql` çalıştır
4. `database/migrations/add_tv_ui_customization.sql` çalıştır

### 3️⃣ Super Admin Oluştur
1. Authentication > Users > Add User
   - Email: `orhan@example.com`
   - Password: `33333333`
   - Auto Confirm: ✅
2. UUID'yi kopyala
3. SQL Editor'de çalıştır:
```sql
INSERT INTO users (id, email, role) 
VALUES ('UUID_BURAYA', 'orhan@example.com', 'super_admin');
```

### 4️⃣ Environment Dosyalarını Güncelle
- `backend/.env` → Supabase bilgilerini ekle
- `frontend/.env.local` → Supabase bilgilerini ekle

### 5️⃣ Sistemi Başlat
```bash
./scripts/start-clean.sh
```

## Giriş
- URL: http://localhost:3000
- Email: orhan@example.com
- Password: 33333333
