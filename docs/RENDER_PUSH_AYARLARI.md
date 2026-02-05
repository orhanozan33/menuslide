# Render – Push ve Deploy Ayarları

Backend canlıda **Render** üzerinde çalışıyor. GitHub’a push ettiğinizde otomatik deploy olması ve doğru ayarların kullanılması için aşağıdakileri uygulayın.

---

## 1. Push = Deploy (Otomatik)

- Render’da servis **GitHub repo’ya bağlı** ise, **main** (veya seçtiğiniz branch)’e her **push** yaptığınızda yeni bir deploy başlar.
- **Kontrol:** Render Dashboard → **tvproje-backend** → **Settings** → **Build & Deploy** → **Auto-Deploy** = **Yes** olmalı.

```bash
git add .
git commit -m "Backend güncelleme"
git push origin main
```

Push sonrası Render **Logs** sekmesinde build ve start log’larını görebilirsiniz.

---

## 2. Render’da Temel Ayarlar (Settings)

| Alan | Değer | Açıklama |
|------|--------|----------|
| **Root Directory** | `backend` | Repo kökü değil, backend klasörü. |
| **Build Command** | `npm ci --include=dev && npm run build` | Bağımlılıklar + NestJS build. |
| **Start Command** | `npm run start:prod` | `node dist/main`. |
| **Plan** | Free (veya Starter) | Free’de uyku modu olur. |

Bu alanlar **render.yaml** ile gelir; Blueprint kullandıysanız zaten doludur. Manuel servis oluşturduysanız yukarıdaki gibi girin.

---

## 3. Environment Variables (Ortam Değişkenleri)

**Render Dashboard** → **tvproje-backend** → **Environment** → **Add Environment Variable** veya **Bulk Edit**.

### Zorunlu (canlı için)

| Key | Örnek / Açıklama |
|-----|-------------------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render çoğu zaman otomatik verir) |
| `DATABASE_URL` | `postgresql://postgres:SIFRE@db.XXXX.supabase.co:5432/postgres` (Supabase → Settings → Database → Connection string, port **5432** veya pooler **6543**) |
| `JWT_SECRET` | En az 32 karakter (örn. `openssl rand -base64 32`) |
| `SUPABASE_URL` | `https://XXXX.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role key |
| `CORS_ORIGIN` | `https://menuslide.com` (canlı frontend adresi; **sonda / olmasın**) |

### İsteğe bağlı

| Key | Açıklama |
|-----|----------|
| `ONE_TIME_IMPORT` | İlk canlıya alımda **bir kerelik** tüm veriyi DB’ye aktarmak için `1` veya `true`. Sonra kaldırabilirsiniz. |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `ADMIN_EMAIL` | Bildirim için e-posta |

### Toplu yapıştır (Bulk Edit)

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://postgres:SIFRENIZ@db.XXXX.supabase.co:5432/postgres
JWT_SECRET=buraya_32_karakter_uzun_guclu_anahtar
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CORS_ORIGIN=https://menuslide.com
```

`SIFRENIZ`, `XXXX` ve `JWT_SECRET` değerlerini kendi projenize göre değiştirin.

---

## 4. Bir Kerelik Import (İlk Canlıya Alma)

Tüm yerel veriyi canlıya **tek sefer** aktarmak için:

1. **Environment**’a ekleyin: `ONE_TIME_IMPORT=1`
2. **Manual Deploy** veya bir **push** yapın.
3. Backend açılışta `database/supabase-ensure-columns-before-import.sql` ve `database/export-from-local-data.sql` çalışır (SQL dosyaları repoda olmalı; **rootDir: backend** olduğu için `database/` klasörü repo kökünde kalır ve backend `../database` ile erişir).
4. İşlem bittikten sonra (opsiyonel) `ONE_TIME_IMPORT` değişkenini kaldırın.

Detay: **docs/BIR_KERELIK_IMPORT_CANLI.md**

---

## 5. Secret File ile Tüm Env’leri Tek Dosyada (Opsiyonel)

Tüm değişkenleri tek dosyada tutup Render’a yükleyebilirsiniz:

1. **Dashboard** → **tvproje-backend** → **Environment** → **Secret Files**.
2. **Add Secret File** → dosya adı: `env`, içeriği: `.env` formatında (her satır `KEY=value`).
3. **Environment**’ta tek değişken: `ENV_FILE_PATH=/etc/secrets/env`

Backend zaten `ENV_FILE_PATH` ile dosyadan env yükleyebilir (ConfigModule).

---

## 6. Özet

| Ne yaparsanız | Sonuç |
|---------------|--------|
| `git push origin main` | Auto-Deploy açıksa yeni deploy başlar. |
| Env değişkeni ekler/değiştirirseniz | **Save** sonrası genelde otomatik redeploy olur; yoksa **Manual Deploy**. |
| Build / start komutları | **render.yaml** veya **Settings → Build & Deploy**’dan. |

**Backend URL:** `https://tvproje-backend.onrender.com` (servis adına göre değişir).  
Vercel’de `NEXT_PUBLIC_API_URL` bu adrese eşit olmalı (sonda `/` yok).
