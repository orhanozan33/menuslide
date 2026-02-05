# Super Admin Kullanıcı Oluşturma (Supabase)

Bu sistem Supabase Auth kullanıyor. Super admin kullanıcısını oluşturmak için:

## Yöntem 1: Supabase Dashboard (Önerilen)

1. Supabase Dashboard'a gidin: https://app.supabase.com
2. Projenizi seçin
3. **Authentication** > **Users** bölümüne gidin
4. **Add User** > **Create New User** tıklayın
5. Bilgileri girin:
   - **Email**: orhan@example.com (veya istediğiniz email)
   - **Password**: 33333333
   - **Auto Confirm User**: ✅ (işaretleyin)
6. **Create User** tıklayın
7. Oluşturulan kullanıcının **UUID**'sini kopyalayın

## Yöntem 2: SQL ile (Supabase SQL Editor)

Supabase SQL Editor'de çalıştırın:

```sql
-- 1. Önce auth.users tablosuna kullanıcı ekleyin (Supabase Auth API kullanarak)
-- Bu işlem için Supabase Dashboard'dan yapılmalı veya Auth API kullanılmalı

-- 2. Kullanıcı oluşturulduktan sonra, users tablosuna super admin olarak ekleyin
-- (UUID'yi Supabase Dashboard'dan alın)

INSERT INTO users (id, email, role, business_id)
VALUES 
    ('SUPABASE_AUTH_USER_UUID_BURAYA', 'orhan@example.com', 'super_admin', NULL)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

## Yöntem 3: Backend API ile (Programatik)

Backend çalıştıktan sonra, Supabase Auth API kullanarak:

```bash
# Supabase Auth API ile kullanıcı oluştur
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "orhan@example.com",
    "password": "33333333",
    "email_confirm": true,
    "user_metadata": {
      "role": "super_admin"
    }
  }'
```

Sonra users tablosuna ekleyin (UUID'yi yukarıdaki response'dan alın).

## Not

Bu sistem Supabase kullanıyor, bu yüzden:
- Veritabanı Supabase'de olmalı
- Auth kullanıcıları Supabase Auth'da oluşturulmalı
- Local PostgreSQL sadece development için kullanılabilir
