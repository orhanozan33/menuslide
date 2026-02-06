# Adım Adım: Supabase + Vercel Kurulum (Satır Satır)

Örnek Supabase projesi: **https://ibtnyekpnjpudjfwmzyc.supabase.co**

---

## ADIM 1 — Supabase’e giriş

1. Tarayıcıda açın: **https://supabase.com/dashboard**
2. Giriş yapın.
3. Projenizi seçin (veya **New project** ile yeni açın).
4. Sol menüden **SQL Editor**’e tıklayın.

---

## ADIM 2 — Eski tabloları silmek (sıfırdan başlıyorsanız)

1. SQL Editor’de **New query** tıklayın.
2. Aşağıdaki SQL’in **tamamını** yapıştırın.
3. **Run** (veya Ctrl+Enter) basın.

```sql
DROP TABLE IF EXISTS screen_edit_history CASCADE;
DROP TABLE IF EXISTS admin_activity_log CASCADE;
DROP TABLE IF EXISTS admin_permissions CASCADE;
DROP TABLE IF EXISTS display_viewers CASCADE;
DROP TABLE IF EXISTS payment_failures CASCADE;
DROP TABLE IF EXISTS screen_template_rotations CASCADE;
DROP TABLE IF EXISTS home_channels CASCADE;
DROP TABLE IF EXISTS contact_info CASCADE;
DROP TABLE IF EXISTS content_library_categories CASCADE;
DROP TABLE IF EXISTS content_library CASCADE;
DROP TABLE IF EXISTS screen_block_contents CASCADE;
DROP TABLE IF EXISTS template_block_contents CASCADE;
DROP TABLE IF EXISTS screen_blocks CASCADE;
DROP TABLE IF EXISTS template_blocks CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS menu_item_translations CASCADE;
DROP TABLE IF EXISTS menu_schedules CASCADE;
DROP TABLE IF EXISTS screen_menu CASCADE;
DROP TABLE IF EXISTS screens CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menus CASCADE;
DROP TABLE IF EXISTS languages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
```

4. "Success" görünce bu adım tamam.

---

## ADIM 3 — Supabase’den değerleri kopyalama

1. Supabase Dashboard’da sol menüden **Settings** (dişli) → **API** sayfasına gidin.
2. Şu satırları not alın (örnek proje: `ibtnyekpnjpudjfwmzyc`):

   - **Project URL**  
     Örnek:  
     `https://ibtnyekpnjpudjfwmzyc.supabase.co`

   - **anon public** (Project API keys bölümünde)  
     Örnek (kısaltılmış):  
     `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

   - **service_role** (aynı yerde; "Reveal" ile gösterin)  
     Örnek (kısaltılmış):  
     `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. Sol menüden **Settings** → **Database** sayfasına gidin.
4. **Database password** satırını bulun.
   - Şifreyi biliyorsanız: aynen kopyalayın.
   - Bilmiyorsanız: **Reset database password** ile yeni şifre oluşturup kopyalayın.

---

## ADIM 4 — Vercel’de environment variable’ları girmek

1. Tarayıcıda açın: **https://vercel.com/dashboard**
2. Projenizi seçin (örn. menuslide / tvproje).
3. Üstten **Settings** → sol menüden **Environment Variables**.
4. **NEXT_PUBLIC_API_URL** varsa **silin** (canlıda boş olacak).
5. Aşağıdaki satırları **tek tek** ekleyin (Name / Value). Production ve Preview ikisini de seçin.

| Adım | Name | Value (sizin değerlerinizle doldurun) |
|------|------|--------------------------------------|
| 5.1 | `NEXT_PUBLIC_SUPABASE_URL` | `https://ibtnyekpnjpudjfwmzyc.supabase.co` |
| 5.2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (API → anon public key’i yapıştırın) |
| 5.3 | `SUPABASE_SERVICE_ROLE_KEY` | (API → service_role key’i yapıştırın) |
| 5.4 | `JWT_SECRET` | Örn: `BenimGucluJwtSecret2024Rastgele` (en az 20 karakter) |
| 5.5 | `SUPABASE_DB_PASSWORD` | (Settings → Database → Database password) |
| 5.6 | `BOOTSTRAP_SECRET` | Örn: `BootstrapTablolariAc123XYZ` (gizli kalacak) |

6. Her satır için **Save** tıklayın.

Örnek (kendi değerlerinizi yazın):

```
NEXT_PUBLIC_SUPABASE_URL = https://ibtnyekpnjpudjfwmzyc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
JWT_SECRET = BenimGucluJwtSecret2024Rastgele
SUPABASE_DB_PASSWORD = Supabase_veritabani_orhanozan33
BOOTSTRAP_SECRET = BootstrapTablolariAc123XYZ
```

---

## ADIM 5 — Vercel’de Redeploy

1. Vercel’de üstten **Deployments** sekmesine gidin.
2. En üstteki (en son) deployment’ın sağındaki **⋯** (üç nokta) → **Redeploy**.
3. **Redeploy** onaylayın.
4. Build bitene kadar bekleyin (birkaç dakika).

---

## ADIM 6 — Tabloları otomatik oluşturma (bir kez)

1. Canlı sitenizin adresini bilin. Örnek:  
   `https://tvproje.vercel.app`  
   veya  
   `https://menuslide.com`

2. Tarayıcıda **tek satırda** şu adresi açın (BOOTSTRAP_SECRET’ı ADIM 4’te yazdığınızla değiştirin):

   ```
   https://tvproje.vercel.app/api/setup/bootstrap-db?secret=BootstrapTablolariAc123XYZ
   ```

   Kendi domain’iniz farklıysa sadece başı değişir:

   ```
   https://SIZIN_DOMAIN/api/setup/bootstrap-db?secret=BootstrapTablolariAc123XYZ
   ```

3. Sayfada şunu görmelisiniz:

   ```json
   {"ok":true,"message":"Tablolar oluşturuldu."}
   ```

4. **401** görürseniz: Vercel’de `BOOTSTRAP_SECRET` doğru mu kontrol edin, Redeploy yapıp tekrar deneyin.
5. **500** görürseniz: `SUPABASE_DB_PASSWORD` ve `NEXT_PUBLIC_SUPABASE_URL` (örn. `https://ibtnyekpnjpudjfwmzyc.supabase.co`) doğru mu kontrol edin.

---

## ADIM 7 — İlk admin kullanıcısı (giriş yapabilmek için)

1. Supabase’e dönün → **SQL Editor** → **New query**.
2. Aşağıdaki SQL’i yapıştırın.
3. **Şifre hash** kısmını değiştirin:  
   - Şifre: örn. `Admin123!`  
   - Hash: https://bcrypt-generator.com/ ile "Admin123!" yazıp **Hash** deyin, çıkan `$2a$10$...` değerini kopyalayın.
4. `admin@example.com` yerine kendi email’inizi yazabilirsiniz.
5. **Run** basın.

```sql
INSERT INTO businesses (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Admin', 'admin', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, role, business_id)
VALUES (
  uuid_generate_v4(),
  'admin@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJdLzLHjdhG',
  'super_admin',
  NULL
)
ON CONFLICT (email) DO NOTHING;
```

(Yukarıdaki hash örnek; kendi şifreniz için yeni hash üretin.)

---

## ADIM 8 — Canlıda giriş testi

1. Canlı siteyi açın: örn. **https://tvproje.vercel.app/login**
2. ADIM 7’de kullandığınız **email** ve **şifre** ile giriş yapın.
3. Dashboard açılıyorsa kurulum tamam.

---

## Özet (kopyala-yapıştır listesi)

- Supabase URL: `https://ibtnyekpnjpudjfwmzyc.supabase.co`
- Supabase → Settings → API: anon key + service_role key kopyala.
- Supabase → Settings → Database: Database password kopyala (veya resetle).
- Vercel → Settings → Environment Variables: 6 değişken ekle (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, SUPABASE_DB_PASSWORD, BOOTSTRAP_SECRET).
- Vercel → Deployments → Redeploy.
- Tarayıcıda aç: `https://SIZIN_SITE/api/setup/bootstrap-db?secret=BOOTSTRAP_SECRET`
- Supabase SQL Editor’de admin INSERT’i çalıştır → canlıda login test et.
