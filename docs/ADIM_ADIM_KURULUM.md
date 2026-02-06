# Adım Adım Kurulum — Vercel + Supabase

Sistemi sıfırdan ayağa kaldırmak için **sırayla** aşağıdaki adımları uygulayın.

---

## BÖLÜM A: Supabase

### Adım 1 — Supabase projesi

1. Tarayıcıda **https://supabase.com/dashboard** açın.
2. **New project** (veya zaten varsa projenizi seçin).
3. Proje adı, veritabanı şifresi ve bölge seçin → **Create new project**.
4. Proje hazır olana kadar bekleyin (birkaç dakika).

---

### Adım 2 — API anahtarlarını not edin

1. Sol menüden **Settings** (dişli) → **API**.
2. Şunları bir yere kopyalayın (sonra Vercel ve .env.local için kullanacaksınız):

| Ekranda gördüğünüz | Kopyalayacağınız değişken adı |
|--------------------|-------------------------------|
| **Project URL**    | `NEXT_PUBLIC_SUPABASE_URL`    |
| **anon public** (Project API keys altında) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** (Secret; "Reveal" ile gösterin) | `SUPABASE_SERVICE_ROLE_KEY` |

---

### Adım 3 — Veritabanı: Ana şema

1. Sol menü **SQL Editor** → **New query**.
2. Proje klasörünüzdeki **`database/schema-local.sql`** dosyasını açın.
3. İçeriğin **tamamını** kopyalayıp SQL Editor’e yapıştırın.
4. **Run** (veya Ctrl+Enter).
5. Hata yoksa “Success” görmelisiniz. “already exists” görürseniz sorun yok, devam edin.

---

### Adım 4 — Veritabanı: Şablon tabloları

Aynı şekilde (New query → dosyayı aç → içeriği yapıştır → Run) sırayla şu dosyaları çalıştırın:

| Sıra | Dosya |
|------|--------|
| 1 | `database/templates-schema.sql` |
| 2 | `database/template-block-contents-schema.sql` |
| 3 | `database/template-editor-schema.sql` |
| 4 | `database/text-content-schema.sql` |
| 5 | `database/migration-create-content-library.sql` |

Her biri için **yeni bir query** açıp ilgili dosyanın **tüm içeriğini** yapıştırıp Run deyin.

---

### Adım 5 — Veritabanı: Migration dosyaları

`database/` klasöründeki aşağıdaki dosyaları **sırayla** SQL Editor’de çalıştırın (her biri için New query → dosya içeriği → Run):

1. `migration-add-7-8-templates.sql`
2. `migration-add-admin-activity-log.sql`
3. `migration-add-admin-permission-actions.sql`
4. `migration-add-admin-reference-number.sql`
5. `migration-add-admin-role-and-permissions.sql`
6. `migration-add-alcoholic-drinks-glasses.sql`
7. `migration-add-canvas-design-to-templates.sql`
8. `migration-add-desserts-category.sql`
9. `migration-add-display-frame-ticker.sql`
10. `migration-add-display-scale-indexes.sql`
11. `migration-add-drink-content-type.sql`
12. `migration-add-invoice-number.sql` *(yoksa atlayın)*
13. `migration-add-preferred-locale.sql`
14. `migration-add-public-slug.sql`
15. `migration-add-qr-background-to-businesses.sql`
16. `migration-add-reference-number.sql`
17. `migration-add-regional-category.sql`
18. `migration-add-regional-menu-content-type.sql`
19. `migration-add-rotation-transition-effect.sql`
20. `migration-add-template-rotation.sql`
21. `migration-add-template-transition-effect.sql` *(yoksa atlayın)*
22. `migration-add-ticker-style.sql`
23. `migration-add-uploaded-by-to-content-library.sql`
24. `migration-add-video-content-type.sql`
25. `migration-add-video-to-screen-block-contents.sql`
26. `migration-add-video-type-to-content-library.sql`
27. `migration-clean-content-library-duplicates.sql`
28. `migration-clean-content-library-duplicates-v2.sql`
29. `migration-content-library-categories.sql`
30. `migration-content-library-english-canadian-drinks.sql`
31. `migration-display-viewers.sql`
32. `migration-display-viewers-first-seen.sql`
33. `migration-enrich-content-library-images.sql`
34. `migration-enrich-food-soups-fish-doner-breakfast.sql`
35. `migration-fix-2-block-template-height.sql`
36. `migration-fix-5-3-7-block-special-layout.sql`
37. `migration-fix-all-system-template-blocks-layout.sql` *(yoksa atlayın)*
38. `migration-fix-orhan-template-name.sql`
39. `migration-import-all-categories.sql`
40. `migration-import-content-library.sql`
41. `migration-increase-block-count-limit.sql`
42. `migration-invoice-auto-number-trigger.sql`
43. `migration-menu-pages.sql`
44. `migration-move-pasta-to-pasta-category.sql`
45. `migration-plan-names.sql`
46. `migration-plans-1-3-1-5-1-7-1-10-unlimited.sql`
47. `migration-prices-end-99.sql`
48. `migration-pricing-11-99.sql`
49. `migration-pricing-11-99-per-tv.sql`
50. `migration-pricing-12-99-per-tv.sql`
51. `migration-pricing-13-99-per-tv.sql`
52. `migration-pricing-14-99.sql` *(yoksa atlayın)*
53. `migration-pricing-packages.sql`
54. `migration-remove-regional-tek-menu-category.sql`
55. `migration-stripe-price-1screen.sql`

Bir dosya yoksa o satırı atlayıp bir sonrakine geçin. “already exists” hatası alırsanız da devam edin.

---

### Adım 6 — Veritabanı: migrations klasörü

`database/migrations/` içindeki dosyaları sırayla çalıştırın:

1. `migrations/add_advanced_features.sql`
2. `migrations/add_billing_interval.sql`
3. `migrations/add_display_scale_indexes.sql`
4. `migrations/add_payment_failures.sql`
5. `migrations/add_tv_ui_customization.sql`

---

### Adım 7 — Veritabanı: İletişim ve kanallar

1. SQL Editor’de **New query**.
2. **`database/migration-contact-info-home-channels.sql`** dosyasının içeriğini yapıştırın → **Run**.

*(Dosya yoksa SUPABASE_MIGRATION_SIRASI.md içindeki “ADIM 9”daki SQL bloğunu kopyalayıp çalıştırın.)*

---

### Adım 8 — Veritabanı: TV ekranı fonksiyonu

1. SQL Editor’de **New query**.
2. **`database/supabase-add-get-active-menu-function.sql`** dosyasının **tüm içeriğini** yapıştırın → **Run**.

Bu adım TV’de yayın açılması için gerekli.

---

### Adım 9 — Veritabanı: Ödeme ve QR (varsa)

Projede **`database/supabase-add-payment-failures-and-qr-menus.sql`** dosyası varsa, içeriğini SQL Editor’de çalıştırın. Yoksa bu adımı atlayın.

---

### Adım 10 — Storage: Resim/video bucket

1. Sol menü **Storage**.
2. **New bucket**.
3. **Name:** `menuslide` (tam bu isim).
4. **Public bucket** kutusunu işaretleyin (resim/video linkleri herkese açık olsun).
5. **Create bucket**.

Detay: `docs/SUPABASE_STORAGE_MENUSLIDE.md`

---

### Adım 11 — İlk kullanıcı (giriş yapabileceğiniz admin)

1. Sol menü **Authentication** → **Users**.
2. **Add user** → **Create new user**.
3. E-posta ve şifre girin (örn. `admin@example.com` / güçlü bir şifre) → **Create user**.
4. Listede oluşan kullanıcıya tıklayın; **User UID** (UUID) değerini kopyalayın.
5. **SQL Editor** → New query. Aşağıdaki SQL’de **BURAYA_USER_UID** yerine az önce kopyaladığınız UUID’yi, **admin@example.com** yerine kendi e-postanızı yazın. Sonra **Run**:

```sql
INSERT INTO users (id, email, role, business_id)
VALUES ('BURAYA_USER_UID', 'admin@example.com', 'super_admin', NULL)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

Artık bu e-posta ve şifreyle giriş yapabilirsiniz.

---

## BÖLÜM B: Vercel

### Adım 12 — Vercel’de proje

1. **https://vercel.com** → Giriş yapın.
2. **Add New** → **Project**.
3. GitHub/GitLab/Bitbucket ile repoyu bağlayın (veya **Import** ile projeyi yükleyin).
4. **Root Directory** olarak **frontend** klasörünü seçin (proje kökü değil).
5. **Environment Variables** bölümüne geçin; Adım 13’te ekleyeceğiz, şimdilik **Deploy** ile projeyi oluşturabilirsiniz.

---

### Adım 13 — Vercel ortam değişkenleri

1. Vercel’de projenize girin → **Settings** → **Environment Variables**.
2. Aşağıdaki her satır için **Name** ve **Value** girip **Save** deyin. **Environment** olarak **Production** (ve isterseniz Preview) seçin.

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Adım 2’de not ettiğiniz Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Adım 2’de not ettiğiniz anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Adım 2’de not ettiğiniz service_role key |
| `JWT_SECRET` | En az 32 karakter rastgele metin (örn. uzun bir şifre) |
| `NEXT_PUBLIC_API_URL` | **Boş bırakın** (hiçbir şey yazmayın) |
| `NEXT_PUBLIC_APP_URL` | Canlı siteniz: `https://projeniz.vercel.app` veya `https://menuslide.com` |

**Önemli:** `NEXT_PUBLIC_API_URL` mutlaka boş olmalı; böylece API istekleri Vercel üzerinden Supabase’e gider.

İsteğe bağlı (ödeme için):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe pk_test_... veya pk_live_... |
| `STRIPE_SECRET_KEY` | Stripe sk_test_... veya sk_live_... |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook whsec_... |

---

### Adım 14 — Vercel’de yeniden deploy

1. **Deployments** sekmesine gidin.
2. En üstteki (son) deployment’ın yanındaki **⋯** (üç nokta) → **Redeploy**.
2. **Redeploy** onaylayın. Bitene kadar bekleyin.

Bundan sonra canlı siteniz bu ortam değişkenleriyle çalışır.

---

## BÖLÜM C: Yerel bilgisayarda çalıştırma

### Adım 15 — Ortam dosyası

1. Proje kökünde terminal açın.
2. Şu komutu çalıştırın:

```bash
cp frontend/.env.example frontend/.env.local
```

3. **`frontend/.env.local`** dosyasını bir metin editörüyle açın.
4. Şu satırları kendi değerlerinizle değiştirin (Adım 2’deki Supabase değerleri):

- `NEXT_PUBLIC_SUPABASE_URL=...` → Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` → anon key
- `SUPABASE_SERVICE_ROLE_KEY=...` → service_role key
- `JWT_SECRET=...` → En az 32 karakter rastgele metin

5. **Şu satırın boş kaldığından emin olun** (Vercel API kullanılsın):

- `NEXT_PUBLIC_API_URL=`

6. İsterseniz: `NEXT_PUBLIC_APP_URL=http://localhost:3000`  
Dosyayı kaydedin.

---

### Adım 16 — Frontend’i başlatma

1. Proje kökünde terminalde:

```bash
./scripts/start-vercel-frontend.sh
```

*(Script yoksa: `cd frontend` → `npm install` → `npm run dev`.)*

2. Çıktıda **“Ready in …”** gördüğünüzde tarayıcıda **http://localhost:3000** açın.
3. **Login** sayfasından Adım 11’de oluşturduğunuz e-posta ve şifreyle giriş yapın.

Giriş başarılıysa kurulum tamam demektir.

---

## Özet: Hangi adım ne işe yarıyor?

| Adım | Ne yapıyorsunuz |
|------|------------------|
| 1–2 | Supabase projesi ve API anahtarları |
| 3–9 | Veritabanı tabloları ve fonksiyonlar (şema + migration’lar) |
| 10 | Resim/video depolama (menuslide bucket) |
| 11 | Giriş yapacağınız admin kullanıcı |
| 12–14 | Vercel’de proje + env + deploy |
| 15–16 | Yerelde .env.local + frontend çalıştırma |

Takıldığınız adımı not alıp hata mesajıyla birlikte paylaşırsanız, o adıma özel netleştirme yapılabilir.
