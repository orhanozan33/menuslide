# Canlıda Veri Karmaşası / Eksik Veri — Sorun Giderme

Yerelde (local) her şey çalışıyor ama **canlıda (Vercel)** şablonlar yok, abonelikler yok, ekranlar karışık, kullanıcılar Hazır Şablonlar’da liste boş görünüyorsa bu rehberi adım adım uygulayın.

---

## 1. Yerel vs canlı farkı

| Ortam   | Veritabanı     | API                    |
|--------|-----------------|------------------------|
| Yerel  | Local PostgreSQL (backend) | Backend (localhost) veya /api/proxy + Supabase |
| Canlı  | **Sadece Supabase**       | Vercel `/api/proxy` → Supabase (Render yok)   |

Canlıda tüm veri **Supabase**’te olmalı. Yerelde gördüğünüz şablonlar, kullanıcılar, abonelikler yerel PostgreSQL’de; canlıda aynı verilerin **Supabase’e taşınmış** olması gerekir.

---

## 2. Kontrol listesi (sırayla yapın)

### Adım A: Vercel ortam değişkenleri

- **Settings** → **Environment Variables**
- **NEXT_PUBLIC_API_URL**: **Boş** veya tanımsız (dolu olursa istekler Render’a gider, veri gelmez).
- Şunlar **mutlaka** dolu:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_SECRET` (en az 32 karakter)
- Değişiklikten sonra: **Redeploy**.

### Adım B: Supabase’de veri var mı?

Supabase **SQL Editor** veya `psql` ile aşağıdaki sorguları çalıştırın:

```sql
-- Satır sayıları (0 ise veri yok)
SELECT 'users' AS tablo, COUNT(*) AS adet FROM users
UNION ALL SELECT 'businesses', COUNT(*) FROM businesses
UNION ALL SELECT 'templates', COUNT(*) FROM templates
UNION ALL SELECT 'template_blocks', COUNT(*) FROM template_blocks
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'screens', COUNT(*) FROM screens
UNION ALL SELECT 'content_library', COUNT(*) FROM content_library;
```

- **Hepsi 0** → Veri hiç import edilmemiş; **Adım C** ile yerel veriyi Supabase’e gönderin.
- **templates = 0** veya **template_blocks = 0** → Şablonlar eksik; yine **Adım C** gerekli.
- **users = 0** → Giriş / yetki verisi yok; **Adım C** ile users da gelecek.

Hazır şablonların listelenmesi için:

```sql
-- Sistem şablonları (Hazır Şablonlar sekmesi)
SELECT id, name, display_name, scope, is_active
FROM templates
WHERE scope = 'system' AND is_active = true
ORDER BY block_count, name
LIMIT 20;
```

Burada da 0 satır çıkıyorsa canlıda “Hazır Şablonlar” boş görünür.

### Adım C: Yerel veriyi Supabase’e tek seferde gönderme

Yerelde çalışan veriyi (şablonlar, kullanıcılar, ekranlar, abonelikler, kütüphane vb.) canlıya taşımak için:

1. **Supabase DB şifresi:** Dashboard → **Settings** → **Database** → Database password.
2. Proje kökünde:
   ```bash
   export SUPABASE_DB_PASSWORD='şifreniz'
   ./scripts/push-to-supabase.sh
   ```
3. Script:
   - Yerelden export alır (veya mevcut `database/export-from-local-data.sql` kullanır),
   - Supabase’de şablon/blok/kütüphane/ekran blokları tablolarını truncate eder,
   - Export’u Supabase’e import eder,
   - `/uploads/` path’lerini Storage URL’ine günceller.

Detay: [PUSH_TO_SUPABASE_ADIM_ADIM.md](PUSH_TO_SUPABASE_ADIM_ADIM.md).

**Önemli:** Export’ta `users` ve `businesses` **ON CONFLICT … DO NOTHING** ile yazılır. Yani canlıda aynı email ile kullanıcı zaten varsa, yereldeki `id` yazılmaz; şablonlardaki `created_by` yereldeki admin id’si olarak kalır. Canlıda giriş yapan kullanıcının `users.id`’si farklıysa “benim şablonlarım” veya yetki kontrolleri boş/yanlış olabilir. İlk kurulumda canlıda henüz kullanıcı yokken push yaparsanız bu risk azalır.

### Adım D: Giriş yapan kullanıcı = veritabanındaki kullanıcı

- Canlıda giriş **email + şifre** ile `public.users` üzerinden yapılıyor (Supabase Auth değil).
- JWT’deki `userId` = `public.users.id`.
- Şablonlar: `created_by` = bu `users.id`. Ekranlar/abonelikler: `business_id` → `users.business_id`.

Eğer canlıda “ilk kez kayıt olan” bir kullanıcı ile yerelde export ettiğiniz kullanıcı farklıysa (farklı id), canlıda o kullanıcı için şablon/ekran/abonelik listesi boş görünebilir. Bunu düzeltmek için:

- Ya canlıda **push’tan önce** yeni kullanıcı oluşturmayın; push’u çalıştırıp yerel kullanıcıları (ve id’leri) Supabase’e alın, sonra aynı email/şifre ile giriş yapın.
- Ya da push sonrası Supabase’de `users` tablosunda “canlıda giriş yapan” kullanıcının `id`’sini kontrol edin; şablonların `created_by` değerinin bu id ile eşleşmesi gerekir (gerekirse manuel UPDATE ile düzeltebilirsiniz).

### Adım E: Resim / video 404

- Vercel’de `NEXT_PUBLIC_SUPABASE_URL` tanımlı olmalı.
- Supabase Storage’da `menuslide` bucket’ı public olmalı; dosyalar `uploads/` veya `uploads/migrated/` altında olmalı.
- Push script’i path’leri Storage URL’ine günceller. Eksik kalanlar için: [VERCEL_CANLI_VERI_VE_STORAGE.md](VERCEL_CANLI_VERI_VE_STORAGE.md).

---

## 3. Özet tablo

| Sorun | Ne yapılır |
|--------|------------|
| Canlıda hiç veri yok, sayılar 0 | NEXT_PUBLIC_API_URL boş mu kontrol et; Supabase env’leri dolu mu; **push-to-supabase.sh** çalıştır. |
| Hazır Şablonlar boş | Supabase’de `templates` ve `template_blocks` dolu mu, `scope='system'` ve `is_active=true` şablon var mı kontrol et; yoksa push tekrar çalıştır. |
| Abonelikler / ekranlar karışık veya yok | `subscriptions`, `screens`, `users`, `businesses` sayılarını kontrol et; giriş yapan kullanıcının `users.id` ve `business_id` ile veriler eşleşiyor mu kontrol et; gerekirse push’u yeniden çalıştır (yerel veri güncelse). |
| Resim/video açılmıyor | NEXT_PUBLIC_SUPABASE_URL + Storage bucket public + migration/push ile path güncellemesi. |

---

## 4. Hızlı teşhis (Supabase SQL)

```sql
-- 1) Genel sayılar
SELECT 'users' AS t, COUNT(*) FROM users
UNION ALL SELECT 'templates', COUNT(*) FROM templates
UNION ALL SELECT 'template_blocks', COUNT(*) FROM template_blocks
UNION ALL SELECT 'screens', COUNT(*) FROM screens
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions;

-- 2) Sistem şablonları (Hazır Şablonlar)
SELECT COUNT(*) FROM templates WHERE scope = 'system' AND is_active = true;

-- 3) Bir kullanıcının id’si (email ile)
SELECT id, email, role, business_id FROM users WHERE email = 'orhanozan33@hotmail.com';
```

Bu çıktılarla “veri var mı?”, “sistem şablonu var mı?”, “giriş yapan kullanıcı id’si ne?” sorularını yanıtlayabilirsiniz.
