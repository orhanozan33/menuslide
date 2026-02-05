# Backend’i Render’da Deploy Etme (Adım Adım)

Backend’i **sizin** Render hesabınızda deploy etmek için aşağıdaki adımları uygulayın. Bu işlemleri (Render’a giriş, repo bağlama, env değişkenlerini girmek) sadece siz yapabilirsiniz.

---

## 1. Hazırlık

- GitHub’da bu projenin (Tvproje) push edilmiş olduğundan emin olun.
- Supabase’den **Connection string** (Transaction pooler, port **6543**) ve **Service Role Key** değerlerini biliyor olun.
- İsterseniz `backend/.env` içindeki `JWT_SECRET` değerini kopyalayıp Render’da kullanın; yoksa yeni bir tane üretebilirsiniz (örn. `openssl rand -base64 32`).

---

## 2. Render’da Blueprint ile Servis Oluşturma

1. **https://dashboard.render.com** adresine gidin ve giriş yapın.
2. **New +** → **Blueprint** seçin.
3. **Connect a repository** ile GitHub hesabınızı bağlayın (henüz bağlı değilse).
4. **Tvproje** (veya bu backend’in bulunduğu repo) repoyu seçin.
5. Render, repo kökündeki **render.yaml** dosyasını bulacak ve “tvproje-backend” adında bir **Web Service** önerecek.
6. **Apply** / **Create resources** benzeri butona tıklayın.
7. **Environment variables** kısmında `sync: false` ile tanımlı olanlar için sizden değer istenir. Aşağıdaki değerleri girin:

| Değişken | Nereden / Ne yazılacak |
|----------|------------------------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (URI, **Transaction pooler**, port **6543**). Örnek: `postgresql://postgres.[ref]:[ŞİFRENİZ]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres` |
| `JWT_SECRET` | En az 32 karakter güçlü bir string (mevcut backend `.env` değeriniz veya `openssl rand -base64 32` çıktısı). |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL (örn. `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` (secret) key |
| `CORS_ORIGIN` | Vercel frontend adresiniz (örn. `https://tvproje.vercel.app` veya kullandığınız domain). Virgülle birden fazla origin yazmayın; tek bir origin yeterli, backend zaten localhost’u da kabul ediyor. |

Stripe kullanacaksanız (opsiyonel):

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` alanlarını da doldurun.

8. **Create / Deploy** ile servisi oluşturun. İlk deploy birkaç dakika sürebilir.

---

## 3. Backend URL’ini Alma

- Deploy bittikten sonra Render, servise şu formatta bir URL verir:  
  **`https://tvproje-backend.onrender.com`** (servis adı farklıysa ona göre değişir).
- Bu URL, backend’in **canlı adresi**dir. Buna **Backend URL** diyeceğiz.

---

## 4. Vercel’de Frontend Ortam Değişkenleri

1. **Vercel Dashboard** → Projeniz → **Settings** → **Environment Variables**.
2. Şunların tanımlı olduğundan emin olun:
   - `NEXT_PUBLIC_API_URL` = **Backend URL** (örn. `https://tvproje-backend.onrender.com`) – sonunda `/` olmasın.
   - `NEXT_PUBLIC_APP_URL` = Frontend’in adresi (örn. `https://tvproje.vercel.app`).
   - Supabase entegrasyonu ile gelen `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` zaten varsa dokunmayın.
3. Değişken ekledikten veya değiştirdikten sonra **Redeploy** yapın ki frontend yeni backend URL’ini kullansın.

---

## 5. Stripe Webhook (Stripe kullanıyorsanız)

- Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
- **Endpoint URL**: `https://tvproje-backend.onrender.com/webhook` (veya backend’inizin webhook path’i).
- İlgili event’leri seçin, **Signing secret**’ı kopyalayıp Render’daki `STRIPE_WEBHOOK_SECRET` env değişkenine yapıştırın ve servisi yeniden deploy edin.

---

## 6. Son Kontrol

- Tarayıcıda: `https://tvproje-backend.onrender.com` (veya sizin backend URL’iniz) açılıyorsa backend ayaktadır.
- Frontend’den giriş / API istekleri yapıp 404 veya CORS hatası olmadığını kontrol edin.
- Render **free** planda servis bir süre kullanılmazsa uykuya geçer; ilk istekte 30–60 saniye gecikme olabilir. Ücretli planda bu olmaz.

---

**Özet:**  
Backend’i siz Render’da Blueprint ile oluşturup env değişkenlerini giriyorsunuz; Vercel’de `NEXT_PUBLIC_API_URL` ve `NEXT_PUBLIC_APP_URL` ile backend ve frontend’i eşleştiriyorsunuz. Bu adımları uyguladıktan sonra deploy tarafı tamamlanmış olur.
