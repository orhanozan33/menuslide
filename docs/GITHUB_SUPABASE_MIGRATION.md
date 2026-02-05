# GitHub ve Supabase Geçiş Rehberi — Tüm Kayıtlar, Resimler ve Videolar

Bu rehber, mevcut sistemdeki **tüm verileri** (PostgreSQL kayıtları, `public/uploads` içindeki resimler/videolar, .env yapılandırmaları) eksiksiz yedekleyip GitHub ve Supabase’e taşımanız için adım adım talimatları içerir.

---

## 1. Yedekleme (Mevcut Sistemden)

### 1.1 Veritabanı (PostgreSQL) tam yedek

Tüm tablolar ve veriler tek dosyada:

```bash
# Proje kökünden
cd /Users/admin/Desktop/Tvproje

# Örnek: Yerel PostgreSQL, kullanıcı postgres, veritabanı adı tvproje (kendi .env değerlerinize göre düzenleyin)
pg_dump -h localhost -U postgres -d tvproje -F c -f backup_db_$(date +%Y%m%d).dump

# İsterseniz plain SQL (okunabilir, büyük dosya):
# pg_dump -h localhost -U postgres -d tvproje -f backup_db_$(date +%Y%m%d).sql
```

`.env` veya `backend/.env` içindeki `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PASSWORD` değerlerini kullanın. Şifre için `PGPASSWORD=xxx pg_dump ...` veya psql ile şifre girin.

### 1.2 Yüklenen dosyalar (resimler, videolar)

Tüm yüklemeler `frontend/public/uploads` altında. Bu klasörü olduğu gibi arşivleyin:

```bash
cd /Users/admin/Desktop/Tvproje
tar -czvf backup_uploads_$(date +%Y%m%d).tar.gz -C frontend public/uploads
# Dosya: backup_uploads_YYYYMMDD.tar.gz
```

Veya sadece kopyala:

```bash
cp -R frontend/public/uploads /Users/admin/Desktop/Tvproje_backup_uploads
```

### 1.3 Ortam değişkenleri (.env)

- `backend/.env` — veritabanı, Stripe, JWT, CORS vb.
- `frontend/.env.local` veya `frontend/.env` — `NEXT_PUBLIC_API_URL`, isteğe bağlı Supabase

Bu dosyaları **güvenli** bir yerde (şifreli disk veya şifreli arşiv) kopyalayın. GitHub’a **asla** commit etmeyin.

```bash
mkdir -p ~/Tvproje_env_backup
cp backend/.env ~/Tvproje_env_backup/backend_env_$(date +%Y%m%d).txt
cp frontend/.env.local ~/Tvproje_env_backup/frontend_env_$(date +%Y%m%d).txt 2>/dev/null || true
```

---

## 2. GitHub’a Kod ve (İsteğe Bağlı) Release Yedekleri

### 2.1 Repo oluşturma ve ilk push

```bash
cd /Users/admin/Desktop/Tvproje
git init
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git add .
# .gitignore'da .env, .env.local, node_modules, .next olmalı
git status   # .env'lerin gelmediğinden emin olun
git commit -m "Initial commit: full codebase"
git branch -M main
git push -u origin main
```

### 2.2 Yedek dosyaları GitHub’a koymayın

- `backup_db_*.dump`, `backup_uploads_*.tar.gz`, `.env` dosyaları repo’ya **eklenmemeli**.
- İsterseniz yedekleri ayrı bir özel repo’da veya GitHub Releases’a “private” asset olarak yükleyebilirsiniz (dikkat: repo public ise release notları görünür, asset’ler görünmez).

---

## 3. Supabase’e Geçiş

### 3.1 Supabase projesi

1. [Supabase Dashboard](https://app.supabase.com) → New Project.
2. Proje ayarlarından **Database → Connection string** (URI) ve **API keys** (anon, service_role) alın.

### 3.2 Şema ve migrasyonlar

Supabase PostgreSQL kullanır. Mevcut projede:

- **Yerel (local) kullanım:** `database/schema-local.sql` + `database/migrations/*.sql` ve `database/migration-*.sql` dosyaları.
- **Supabase Auth kullanacaksanız:** `database/schema.sql` (auth.users’a referanslı) + gerekli migrasyonlar.

**Öneri (veri taşıyacaksanız):** Önce Supabase’de şemayı oluşturun, sonra **sadece veriyi** import edin (pg_restore veya INSERT’ler). Local şema ile Supabase’de auth kullanmıyorsanız `schema-local.sql` tabloları uyumludur.

1. Supabase SQL Editor’ü açın.
2. Sırayla çalıştırın:
   - `database/schema-local.sql` (veya Supabase auth kullanacaksanız schema.sql’i uyarlayın)
   - Tüm `database/migration-*.sql` ve `database/migrations/*.sql` (sıra önemli; bağımlılıklara dikkat)
   - Fiyatlandırma için: `database/migration-pricing-12-99-per-tv.sql`

### 3.3 Veriyi Supabase’e aktarma

Yerel dump’ı Supabase’e veri olarak aktarmak:

- **Seçenek A — pg_restore (custom format):**  
  Supabase “Database → Connect” ile verilen connection string’i kullanın. `pg_restore` ile **sadece data** (schema olmadan) restore edebilirsiniz; önce şema ve migrasyonları Supabase’de çalıştırdıysanız:

  ```bash
  pg_restore -h db.XXXX.supabase.co -U postgres -d postgres --data-only --no-owner --no-privileges backup_db_YYYYMMDD.dump
  ```

- **Seçenek B — SQL dump (insert’ler):**  
  Önce yerelde sadece veri dump’ı alın:

  ```bash
  pg_dump -h localhost -U postgres -d tvproje --data-only --column-inserts -f backup_data_only.sql
  ```

  Sonra Supabase SQL Editor’de `backup_data_only.sql` içeriğini (veya parça parça) çalıştırın. Tablo sırası (foreign key) önemli; gerekirse tabloları sırayla bölerek import edin.

### 3.4 Storage (resimler / videolar)

Tüm medya dosyaları şu an `frontend/public/uploads` altında ve uygulama `/uploads/...` URL’leri kullanıyor.

**Supabase Storage kullanacaksanız:**

1. Supabase Dashboard → Storage → New bucket: örn. `uploads`, public.
2. `backup_uploads_*.tar.gz` içeriğini bu bucket’a yükleyin (Dashboard’dan veya Supabase Storage API ile).
3. Dosya URL’leri şu formata döner: `https://PROJECT_REF.supabase.co/storage/v1/object/public/uploads/DOSYA_ADI`
4. Uygulamada:
   - Ya mevcut `/uploads/...` isteklerini Supabase Storage URL’ine yönlendiren bir proxy kullanırsınız,
   - Ya da veritabanında `image_url`, `preview_image_url` vb. alanları Supabase Storage URL’leri ile güncellersiniz.

**Dosyaları yerelde tutmaya devam edecekseniz:**  
Vercel/Netlify gibi bir host’ta `public/uploads` deploy’a dahil edilir; büyük boyutlarda limitlere takılabilirsiniz. Kalıcı ve ölçeklenebilir çözüm için Supabase Storage önerilir.

---

## 4. Ortam Değişkenlerini Güncelleme

### 4.1 Backend (NestJS)

- `DATABASE_URL` veya `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PASSWORD` → Supabase connection bilgileri.
- Stripe, JWT, CORS ayarlarını production’a göre güncelleyin.

### 4.2 Frontend (Next.js)

- `NEXT_PUBLIC_API_URL` → Production backend URL.
- İsteğe bağlı: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase kullanıyorsanız).

---

## 5. Kontrol Listesi — Eksiksiz Geçiş

- [ ] PostgreSQL tam yedek alındı (`pg_dump` / `.dump`).
- [ ] `frontend/public/uploads` yedeklendi (tar.gz veya kopya).
- [ ] `backend/.env` ve `frontend/.env.local` güvenli yerde kopyalandı; GitHub’a commit edilmedi.
- [ ] GitHub repo oluşturuldu, kod push edildi.
- [ ] Supabase projesi oluşturuldu.
- [ ] Supabase’de şema + tüm migrasyonlar çalıştırıldı (fiyatlandırma dahil).
- [ ] Veritabanı verisi Supabase’e aktarıldı (pg_restore veya data-only SQL).
- [ ] Storage bucket oluşturuldu; uploads arşivi yüklendi (veya URL’ler güncellendi).
- [ ] Backend ve frontend .env’leri Supabase ve production URL’lere göre güncellendi.
- [ ] Stripe webhook ve fiyat ID’leri production için kontrol edildi.

Bu adımlar, sistemdeki **tüm kayıtlar, resimler ve videoların** taşınması için yeterlidir. Sorun olursa yerel yedeklerden geri dönüş her zaman mümkündür.
