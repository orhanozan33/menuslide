# Kurulum Rehberi - Türkçe

## 🚀 Hızlı Başlangıç

### 1. Supabase Projesi Oluşturma

Bu sistem **Supabase** (cloud PostgreSQL) kullanıyor.

1. https://app.supabase.com adresine gidin ve giriş yapın
2. **New Project** tıklayın
3. Proje bilgilerini girin:
   - Name: `tvproje` (veya istediğiniz isim)
   - Database Password: `333333` (veya güçlü bir şifre)
   - Region: Size en yakın bölge
4. **Create new project** tıklayın (birkaç dakika sürebilir)

### 2. Veritabanı Schema'sını Çalıştırma

1. Supabase Dashboard'da **SQL Editor** sekmesine gidin
2. `database/schema.sql` dosyasının içeriğini kopyalayıp yapıştırın
3. **Run** butonuna tıklayın
4. `database/migrations/add_advanced_features.sql` dosyasını çalıştırın
5. `database/migrations/add_tv_ui_customization.sql` dosyasını çalıştırın

### 3. Super Admin Kullanıcı Oluşturma

#### Adım 1: Auth Kullanıcısı Oluştur

1. Supabase Dashboard > **Authentication** > **Users**
2. **Add User** > **Create New User** tıklayın
3. Bilgileri girin:
   - **Email**: `orhan@example.com`
   - **Password**: `33333333`
   - **Auto Confirm User**: ✅ (işaretleyin)
4. **Create User** tıklayın
5. Oluşturulan kullanıcının **UUID**'sini kopyalayın (kullanıcı listesinde görünür)

#### Adım 2: Users Tablosuna Super Admin Olarak Ekle

1. **SQL Editor**'e gidin
2. Aşağıdaki SQL'i çalıştırın (UUID'yi yukarıda kopyaladığınız ile değiştirin):

```sql
INSERT INTO users (id, email, role, business_id)
VALUES 
    ('BURAYA_KOPYALADIGINIZ_UUID', 'orhan@example.com', 'super_admin', NULL)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

### 4. API Anahtarlarını Alma

1. Supabase Dashboard > **Settings** > **API**
2. Şunları kopyalayın:
   - **Project URL** (SUPABASE_URL)
   - **anon public** key (SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY) - ⚠️ Gizli tutun!

### 5. Environment Dosyalarını Güncelleme

**backend/.env** dosyasını düzenleyin:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**frontend/.env.local** dosyasını düzenleyin:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 6. Bağımlılıkları Yükleme ve Başlatma

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (yeni terminal penceresi)
cd frontend
npm install
npm run dev
```

### 7. Sisteme Giriş

1. Tarayıcıda http://localhost:3000 adresine gidin
2. Login sayfasında:
   - Email: `orhan@example.com`
   - Password: `33333333`
3. Giriş yaptıktan sonra dashboard'u göreceksiniz

## ✅ Kontrol Listesi

- [ ] Supabase projesi oluşturuldu
- [ ] Database schema çalıştırıldı
- [ ] Migrations çalıştırıldı
- [ ] Super admin kullanıcı oluşturuldu (Auth + users tablosu)
- [ ] Environment dosyaları güncellendi
- [ ] Backend başlatıldı (port 3001)
- [ ] Frontend başlatıldı (port 3000)
- [ ] Login başarılı

## 🐛 Sorun Giderme

### "Authentication failed" hatası
- Supabase Auth'da kullanıcının oluşturulduğundan emin olun
- users tablosunda role='super_admin' olduğunu kontrol edin

### "Connection refused" hatası
- Backend'in çalıştığından emin olun (port 3001)
- Environment dosyalarındaki URL'lerin doğru olduğunu kontrol edin

### Database hatası
- Supabase SQL Editor'de schema'nın çalıştırıldığından emin olun
- Tüm migration'ların uygulandığını kontrol edin

## 📞 Yardım

Sorun yaşarsanız:
1. Backend loglarını kontrol edin: `logs/backend.log`
2. Frontend loglarını kontrol edin: `logs/frontend.log`
3. Supabase Dashboard > Logs bölümünü kontrol edin
