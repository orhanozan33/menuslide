# Kurulum Talimatları

## ⚠️ ÖNEMLİ: Bu Sistem Supabase Kullanıyor

Bu sistem Supabase (cloud PostgreSQL) kullanıyor, yerel PostgreSQL değil.

## Adımlar:

### 1. Supabase'de Veritabanı Oluşturma

1. https://app.supabase.com adresine gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. **Settings** > **API** bölümünden:
   - Project URL'i kopyalayın
   - `anon` key'i kopyalayın
   - `service_role` key'i kopyalayın

### 2. Supabase SQL Editor'de Schema Çalıştırma

1. Supabase Dashboard > **SQL Editor**
2. `database/schema.sql` dosyasının içeriğini yapıştırın ve çalıştırın
3. `database/migrations/add_advanced_features.sql` dosyasını çalıştırın
4. `database/migrations/add_tv_ui_customization.sql` dosyasını çalıştırın

### 3. Super Admin Kullanıcı Oluşturma

#### Yöntem 1: Supabase Dashboard

1. **Authentication** > **Users** > **Add User**
2. Bilgileri girin:
   - Email: `orhan@example.com` (veya istediğiniz email)
   - Password: `33333333`
   - Auto Confirm: ✅
3. **Create User** tıklayın
4. Oluşturulan kullanıcının **UUID**'sini kopyalayın

#### Yöntem 2: SQL Editor'de

```sql
-- Önce auth.users tablosuna kullanıcı ekleyin (Supabase Dashboard'dan)
-- Sonra users tablosuna super admin olarak ekleyin:

INSERT INTO users (id, email, role, business_id)
VALUES 
    ('BURAYA_SUPABASE_AUTH_USER_UUID', 'orhan@example.com', 'super_admin', NULL)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

### 4. Environment Dosyalarını Güncelleme

**backend/.env:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**frontend/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Sistemi Başlatma

```bash
./scripts/start-system.sh
```

veya manuel olarak:

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (yeni terminal)
cd frontend
npm install
npm run dev
```

## Erişim

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Login: orhan@example.com / 33333333
