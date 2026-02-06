# Setup Scripts

Bu scriptler sistemi kurmak ve yönetmek için kullanılır.

## Hızlı Kurulum

Tüm sistemi kurmak için:

```bash
./scripts/quick-setup.sh
```

## Manuel Kurulum Adımları

### 1. Tüm Node Süreçlerini Durdur

```bash
./scripts/stop-all-node.sh
```

### 2. Veritabanı Kurulumu

#### Supabase Kullanıyorsanız:

1. Supabase Dashboard > SQL Editor'a gidin
2. Şu dosyaları sırayla çalıştırın:
   - `database/schema.sql`
   - `database/migrations/add_advanced_features.sql`
   - `database/migrations/add_tv_ui_customization.sql`

3. Super Admin oluşturun:
   - `scripts/create-super-admin-supabase.md` dosyasındaki adımları takip edin

#### Local PostgreSQL Kullanıyorsanız:

```bash
./scripts/setup-database.sh
```

### 3. Environment Dosyalarını Yapılandırın

```bash
# Backend
cp backend/.env.example backend/.env
# backend/.env dosyasını düzenleyin

# Frontend
cp frontend/.env.example frontend/.env.local
# frontend/.env.local dosyasını düzenleyin
```

### 4. Bağımlılıkları Yükleyin

```bash
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 5. Sistemi Başlatın

```bash
./scripts/start-system.sh
```

## Sistem Yönetimi

### Sistemi Başlat

```bash
./scripts/start-system.sh
```

### Sistemi Durdur

```bash
./scripts/stop-system.sh
```

### Tüm Node Süreçlerini Durdur

```bash
./scripts/stop-all-node.sh
```

## Super Admin Oluşturma

### Supabase için:

1. Supabase Dashboard > Authentication > Users
2. Yeni kullanıcı oluştur:
   - Email: `orhan@example.com`
   - Password: `33333333`
3. SQL Editor'da şu SQL'i çalıştır:

```sql
INSERT INTO users (id, email, role, business_id)
SELECT 
  id,
  email,
  'super_admin',
  NULL
FROM auth.users
WHERE email = 'orhan@example.com'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'super_admin',
  business_id = NULL;
```

Detaylı adımlar için: `scripts/create-super-admin-supabase.md`

## Log Dosyaları

Log dosyaları `logs/` klasöründe saklanır:

- `logs/backend.log` - Backend logları
- `logs/frontend.log` - Frontend logları
- `logs/backend.pid` - Backend process ID
- `logs/frontend.pid` - Frontend process ID

## Veritabanı: Yerel ↔ Canlı (Supabase)

### Yerel DB = kaynak; her şey Supabase’e aynı anda gitsin

Tasarımı yerel DB’de yapıp, yerelde oluşan her veriyi Supabase’e yansıtmak için:

1. **Yerel DB’yi kaynak alın** – Şablon/blok/tasarım değişikliklerini yerel DB’de yapın (uygulama, SQL veya seed script’leri ile).
2. **Senkronu açın** – Arka planda periyodik sync script’ini çalıştırın; yereldeki değişiklikler belirli aralıklarla Supabase’e gider.

```bash
export SUPABASE_DB_PASSWORD='canli_db_sifreniz'
./scripts/sync-local-to-supabase-watch.sh
```

- Varsayılan: her **15 saniyede** bir sadece **şablon/blok/tasarım** tabloları Supabase’e push edilir (canlı kullanıcı/ekran verisi değişmez).
- Aralığı değiştirmek: `SYNC_INTERVAL=10 ./scripts/sync-local-to-supabase-watch.sh` (10 saniye).
- Tüm tabloları (businesses, users, screens, …) da göndermek: `FULL_SYNC=1 ./scripts/sync-local-to-supabase-watch.sh`

Geliştirme sırasında bir terminalde `npm run dev`, diğerinde bu watch script’i çalışırsa yerel DB’de ne varsa periyodik olarak Supabase’de de olur.

### Yerelde kontrol, canlıdaki veriyi kullanma (Pull)

Canlı sitede sürekli push etmeden yerelde test etmek için, canlı veritabanından yerel DB’ye veri çekebilirsiniz:

```bash
export SUPABASE_DB_PASSWORD='canli_db_sifreniz'
./scripts/pull-from-supabase.sh
```

- **Gereksinim:** `backend/.env` (yerel DB), `frontend/.env.local` (NEXT_PUBLIC_SUPABASE_URL), Supabase Dashboard → Settings → Database şifresi.
- Yerel tablolar önce temizlenir, sonra canlıdaki (Supabase) veri aynı sırayla kopyalanır.
- Eksik tablolar (yerelde veya canlıda yoksa) atlanır.

### Yerel veriyi canlıya gönderme (Push)

**Tüm veri (yerel → Supabase):**
```bash
export SUPABASE_DB_PASSWORD='canli_db_sifreniz'
./scripts/push-to-supabase.sh
```

**Sadece şablon, blok ve tasarım sistemi (canlıdaki kullanıcı/ekran verisine dokunmaz):**
```bash
export SUPABASE_DB_PASSWORD='canli_db_sifreniz'
./scripts/push-templates-design-to-supabase.sh
```
Yerelden export edilen tablolar: `plans`, `languages`, `content_library_categories`, `content_library`, `templates`, `template_blocks`, `template_block_contents`. Supabase’de upsert (INSERT ... ON CONFLICT DO UPDATE) ile güncellenir.

Detay: proje kökündeki `DEPLOYMENT_VERCEL_SUPABASE.md` ve `scripts/push-to-supabase.sh` içindeki yorumlar.

## Sorun Giderme

### Port zaten kullanımda

```bash
# Port 3000'i kontrol et
lsof -i :3000

# Port 3001'i kontrol et
lsof -i :3001

# Port'u serbest bırak
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:3001)
```

### Node süreçleri durmuyor

```bash
# Tüm node süreçlerini zorla durdur
pkill -9 -f node
```

### Veritabanı bağlantı hatası

- `.env` dosyalarını kontrol edin
- Supabase projenizin aktif olduğundan emin olun
- API anahtarlarının doğru olduğunu kontrol edin
