# Sistem Durumu

## ✅ Tamamlanan İşlemler

1. ✅ Tüm Node.js süreçleri durduruldu
2. ✅ Backend başlatıldı (PID: kontrol ediliyor)
3. ✅ Frontend başlatıldı (PID: kontrol ediliyor)
4. ✅ Environment dosyaları hazır

## 📋 Yapılması Gerekenler

### ⚠️ ÖNEMLİ: Supabase Kurulumu Gerekli

Bu sistem **Supabase** kullanıyor. Yerel PostgreSQL değil!

### 1. Supabase Projesi Oluştur
- https://app.supabase.com adresine gidin
- Yeni proje oluşturun
- Database password: `333333`

### 2. Veritabanı Schema'sını Çalıştır
Supabase SQL Editor'de:
- `database/schema.sql` çalıştır
- `database/migrations/add_advanced_features.sql` çalıştır  
- `database/migrations/add_tv_ui_customization.sql` çalıştır

### 3. Super Admin Kullanıcı Oluştur
1. Supabase Dashboard > Authentication > Users
2. Add User:
   - Email: `orhan@example.com`
   - Password: `33333333`
   - Auto Confirm: ✅
3. UUID'yi kopyala
4. SQL Editor'de:
```sql
INSERT INTO users (id, email, role) 
VALUES ('UUID_BURAYA', 'orhan@example.com', 'super_admin');
```

### 4. Environment Dosyalarını Güncelle
`backend/.env` ve `frontend/.env.local` dosyalarına Supabase bilgilerini ekleyin.

## 🔗 Erişim

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## 📝 Loglar

- Backend: `tail -f logs/backend.log`
- Frontend: `tail -f logs/frontend.log`

## 🛑 Durdurma

```bash
./scripts/stop-all-node.sh
```
