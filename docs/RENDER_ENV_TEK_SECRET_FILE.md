# Render’da Tek Seferde Tüm Environment Değişkenlerini Ekleme

Secret File kullanarak tek bir dosyada tüm değerleri ekleyebilirsiniz.

---

## Adım 1: Secret File içeriğini hazırla

1. `docs/RENDER_SECRET_FILE_ornek.env` dosyasını aç (veya aşağıdaki şablonu kopyala).
2. `BURAYA_...` ve placeholder’ları **kendi değerlerinle** değiştir:
   - **DATABASE_URL**: Supabase → Settings → Database → Connection string (URI, port **6543**).
   - **JWT_SECRET**: En az 32 karakter rastgele string (`openssl rand -base64 32`).
   - **SUPABASE_URL**: Supabase → Settings → API → Project URL.
   - **SUPABASE_SERVICE_ROLE_KEY**: Aynı sayfada `service_role` key.
   - **CORS_ORIGIN**: Vercel frontend URL’in (örn. `https://menuslide.vercel.app`).
   - **STRIPE_...**: Stripe Dashboard’dan test key’lerin.
3. Yorum satırlarını (# ile başlayan) istersen sil; Render sadece `KEY=VALUE` satırlarını kullanır.

---

## Adım 2: Render’da Secret File ekle

1. **https://dashboard.render.com** → **tvproje-backend** servisi.
2. Sol menüden **Environment** (Manage altında).
3. **Secret Files** bölümünde **+ Add**.
4. **Filename:** `env` yaz (nokta kullanma).
5. **Contents:** Hazırladığın tüm satırları (KEY=VALUE) yapıştır.
6. **Add** / **Save**.

---

## Adım 3: Uygulamanın bu dosyayı okuması

Backend zaten `ENV_FILE_PATH` değişkenine bakıyor. Render’da **tek bir** Environment Variable eklemen yeterli:

1. Aynı **Environment** sayfasında **Environment Variables** bölümüne in.
2. **Add Environment Variable**
   - **Key:** `ENV_FILE_PATH`
   - **Value:** `/etc/secrets/env`
3. **Save**.

Render, Secret File’ı `/etc/secrets/<filename>` altında sunar; filename’i `env` verdiğin için path bu olur.

---

## Adım 4: Deploy

**Manual Deploy** → **Deploy latest commit** ile yeniden deploy et. Artık tüm değişkenler Secret File’dan okunur.

---

## Not

- **Environment Variables** ile **Secret Files** birlikte kullanılabilir. Aynı key hem ortam değişkeninde hem Secret File’da varsa, genelde **Environment Variables** öncelikli olur (NestJS/ConfigModule davranışı).
- Sadece Secret File kullanıyorsan sadece `ENV_FILE_PATH` ve Secret File yeterli; diğer tüm key’leri Secret File içeriğine yaz.
