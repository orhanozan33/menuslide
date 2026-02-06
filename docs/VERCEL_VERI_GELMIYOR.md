# Kontrol panelinde veri gelmiyor / "Backend bağlantı hatası"

Kontrol panelinde (dashboard) Menüler, Ekranlar, Menü Öğeleri **0** görünüyor ve "Backend bağlantı hatası" alıyorsanız, büyük ihtimalle **Vercel ortam değişkenleri** yanlış.

## Vercel + Supabase kullanıyorsanız (Render yok)

Bu projede API, Vercel serverless fonksiyonları (`/api/proxy`) ve Supabase üzerinden çalışıyor. **Harici backend (Render) kullanmıyorsanız** aşağıdakileri yapın.

### 1. NEXT_PUBLIC_API_URL boş olmalı

- **Vercel Dashboard** → Projeniz → **Settings** → **Environment Variables**
- **NEXT_PUBLIC_API_URL** değişkenine bakın:
  - **Varsa ve doluysa** (örn. `https://xxx.onrender.com`) → **Silin** veya değerini **tamamen boş bırakın**.
  - Çünkü bu değişken dolu olduğunda tüm API istekleri o adrese gider; Render çalışmıyorsa veya yoksa "Backend bağlantı hatası" ve veri gelmez.
- **NEXT_PUBLIC_API_URL** hiç yoksa veya boşsa → istekler kendi sitenize (`/api/proxy`) gider, doğru davranış budur.

### 2. Supabase değişkenleri tanımlı olmalı

Aynı sayfada şunlar **mutlaka** olmalı:

| Name | Açıklama |
|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (gizli) |
| `JWT_SECRET` | En az 32 karakter rastgele string |

Bunlar yoksa veya yanlışsa API route'lar Supabase'e bağlanamaz, veri yine gelmez.

### 3. Redeploy

- **Deployments** → son deployment’ın **⋯** → **Redeploy**
- `NEXT_PUBLIC_*` build’e gömüldüğü için env değiştirdikten sonra **mutlaka** yeniden deploy gerekir.

---

## Özet

| Durum | Yapılacak |
|--------|------------|
| "Backend bağlantı hatası" + veri 0 | NEXT_PUBLIC_API_URL’i silin veya boş bırakın; Supabase env’leri doldurun; Redeploy. |
| Giriş yapılıyor ama sayılar 0 | Supabase’de gerçekten menü/ekran kaydı var mı kontrol edin; env’ler doğruysa veri ekleyince sayılar dolacaktır. |

**Resim / video (Storage) gelmiyorsa:** Vercel’de `NEXT_PUBLIC_SUPABASE_URL` mutlaka tanımlı olmalı; yoksa medya linkleri 404 olur. Ayrıca Supabase Storage’da dosyalar olmalı (migration veya yeni yükleme). Detay: [VERCEL_CANLI_VERI_VE_STORAGE.md](VERCEL_CANLI_VERI_VE_STORAGE.md).

Detaylı kurulum: [docs/ADIM_ADIM_KURULUM.md](ADIM_ADIM_KURULUM.md) veya [docs/VERCEL_SUPABASE_KURULUM.md](VERCEL_SUPABASE_KURULUM.md).
