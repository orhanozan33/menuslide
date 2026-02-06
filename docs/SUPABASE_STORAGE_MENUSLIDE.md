# Supabase Storage: menuslide Bucket

Resim ve videolar **Supabase Storage** içinde `menuslide` bucket'ında tutulur. Böylece sistem hızlı çalışır, dosyalar veritabanında base64 olarak saklanmaz.

## Bucket ayarı (tek sefer)

1. **Supabase Dashboard** → [Storage](https://supabase.com/dashboard/project/ibtnyekpnjpudjfwmzyc/storage/buckets)
2. `menuslide` bucket'ını açın (yoksa **New bucket** → isim: `menuslide`).
3. Bucket'ı **public** yapın: bucket ayarlarında **Public bucket** açık olsun.  
   Böylece dönen URL'ler (örn. `https://...supabase.co/storage/v1/object/public/menuslide/...`) tarayıcıda doğrudan açılır.
4. **Policies**: Public okuma için gerekirse "Allow public read" policy ekleyin (public bucket genelde yeterlidir).

## Uygulama tarafı

- **Yükleme:** `POST /api/upload` → dosya `menuslide` bucket'ına `uploads/YYYY-MM-DD/dosyaadi` formatında yazılır.
- **İçerik kütüphanesi:** Library sayfası ve ContentLibrary bileşeni dosyayı önce `/api/upload` ile yükleyip dönen URL'i veritabanına kaydeder (base64 kullanılmaz).
- **Mevcut base64 kayıtlar:** Eski içerikler hâlâ `url` alanında base64 olabilir; yeni eklenenler Supabase URL'i kullanır.

## Yerel uploads → Storage taşıma

Yerelde `frontend/public/uploads/` içindeki dosyalar Supabase’e taşınmamışsa:

1. **Supabase’de** `menuslide` bucket’ı oluşturulmuş ve **public** olmalı.
2. **Frontend** `.env.local` içinde `NEXT_PUBLIC_SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` tanımlı olmalı.
3. Proje kökünde:
   ```bash
   cd frontend && npm run migrate:uploads
   ```
   veya:
   ```bash
   cd frontend && node -r ./scripts/load-env.js scripts/migrate-uploads-to-supabase.js
   ```

Script şunları yapar:

- `public/uploads/` içindeki tüm dosyaları **Supabase Storage**’a `uploads/migrated/` altına yükler.
- Veritabanında (Supabase) `templates.preview_image_url`, `content_library.url`, `template_block_contents` / `screen_block_contents` içindeki `image_url` ve `background_image_url`, ve `templates.canvas_design` içindeki `/uploads/...` referanslarını bu Storage URL’leriyle günceller.

Böylece yerelde kalan resim/videolar Storage’a gelir ve ekranlar doğru görüntülenir.

## Hızlı kontrol

- Yeni bir resim/video yükleyip kütüphanede görünüyor ve TV/ekranda açılıyorsa Storage doğru çalışıyordur.
- 403 veya resmin açılmaması → bucket'ın **public** olduğundan emin olun.
