# Canlı Sitede Veri ve Resim/Video (Storage) Gelmiyorsa — Vercel Ayarları

Sayfa açılıyor ama **veriler gelmiyor** (şablonlar, menüler, ekranlar 0; “Backend bağlantı hatası”) veya **resim/video yüklenmiyor** (Supabase Storage 404) ise Vercel ortam değişkenlerini aşağıdaki gibi ayarlayın.

---

## Kullanılan mimari: Vercel + Supabase (Render yok)

- Frontend: **Vercel**
- API: Vercel içindeki **/api/proxy** (Supabase’e bağlanır)
- Veritabanı + Auth + Storage: **Supabase**

Bu modda **harici backend (Render) kullanılmaz**. Tüm istekler kendi sitenize gider.

---

## 1. Vercel’de mutlaka olması gereken değişkenler

**Vercel Dashboard** → Projeniz → **Settings** → **Environment Variables**

| Değişken | Değer | Neden gerekli |
|----------|--------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Veri + **Storage URL’leri** (resim/video) için. Yoksa medya 404 olur. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Tarayıcı tarafı auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role (secret) | API route’ların Supabase’e yazması; veri çekmesi. |
| `JWT_SECRET` | En az 32 karakter rastgele string | Giriş token’larının doğrulanması. |

**Önemli:** `NEXT_PUBLIC_SUPABASE_URL` build sırasında koda gömülür. Bu yüzden **resim/video linkleri** Supabase Storage’a doğru gider. Bu değişken yoksa veya yanlışsa Storage 404 alırsınız.

---

## 2. Vercel’de boş / tanımsız olması gereken

| Değişken | Ne yapın |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | **Silin** veya **boş bırakın**. Dolu olursa istekler Render’a gider; veri gelmez / hata alırsınız. |

---

## 3. İsteğe bağlı (önerilen)

| Değişken | Önerilen değer |
|----------|-----------------|
| `NEXT_PUBLIC_APP_URL` | Canlı domain: `https://menuslide.com` (sonda `/` olmasın) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe pk_test_... / pk_live_... |
| `STRIPE_SECRET_KEY` | Abonelik ödeme için (sk_test_... / sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook doğrulama (whsec_...) |

---

## 4. 401 / 500 hataları (Raporlar, kullanıcılar gelmiyor)

| Hata | Muhtemel sebep | Yapılacak |
|------|-----------------|-----------|
| **401 Unauthorized** | Token yok veya JWT doğrulanamıyor. | Vercel’de **JWT_SECRET** tanımlı olsun (en az 32 karakter). Sonra **çıkış yapıp tekrar giriş yapın** (token aynı secret ile yeniden imzalanır). |
| **500 Internal Server Error** | API route hata veriyor; çoğunlukla Supabase env eksik. | Vercel’de **NEXT_PUBLIC_SUPABASE_URL** ve **SUPABASE_SERVICE_ROLE_KEY** tanımlı mı kontrol edin. İkisi de olmazsa `getServerSupabase()` hata fırlatır, 500 döner. |

**Raporlar sayfasında "Tüm üyeler" boş + konsolda 401/500:** Önce yukarıdaki 4 değişkeni (Supabase 3’ü + JWT_SECRET) ekleyin/düzeltin → **Redeploy** → Tarayıcıda **çıkış yapıp canlı siteden tekrar giriş yapın** → Raporlar sayfasını yenileyin.

---

## 5. Environment ve Redeploy

- **Environment:** En az **Production** seçili olsun (Preview kullanıyorsanız onu da ekleyin).
- Değişkenleri ekledikten/değiştirdikten sonra: **Deployments** → son deployment’ın **⋯** → **Redeploy**.  
  `NEXT_PUBLIC_*` değişkenleri build’e gömüldüğü için **Redeploy şart**.

---

## 6. Supabase Storage’da dosya olmalı

- Resim/video **Storage’da yoksa** yine 404 alırsınız.
- Yerelde `public/uploads` (ve alt klasörler) doluysa migration ile Supabase’e yükleyin:
  ```bash
  cd frontend && node -r ./scripts/load-env.js scripts/migrate-uploads-to-supabase.js
  ```
  Script artık **alt klasörleri de** tarar (örn. `public/uploads/2025-02-06/dosya.jpg`); hepsi `uploads/migrated/...` olarak yüklenir ve veritabanındaki ilgili path’ler güncellenir.
- “Sadece bir kısmı geldi” derseniz: Migration’da kaç satır güncellendiğine bakın; `SUPABASE_SERVICE_ROLE_KEY` ile çalıştırın ki tüm tablolar güncellensin. Eksik kalanlar, DB’de farklı path formatında (veya hiç referans yok) olabilir.
- **“Toplam 0 satır güncellendi”** ve tanıda her tabloda **0 satır** görüyorsanız: Supabase’deki veri `/uploads/...` path’i içermiyor demektir (yerel veri Supabase’e hiç import edilmemiş veya farklı proje). Önce yerel veritabanındaki veriyi Supabase’e aktarın ([YERELDEN_SUPABASE_VERI_TASIMA.md](YERELDEN_SUPABASE_VERI_TASIMA.md)), sonra migration script’ini tekrar çalıştırın.
- Yeni yüklemeler uygulama üzerinden yapılıyorsa zaten Storage’a gider (`/api/upload`).

---

## Özet

| Sorun | Yapılacak |
|--------|------------|
| Veri gelmiyor, “Backend bağlantı hatası” | `NEXT_PUBLIC_API_URL` silin/boş; Supabase 4’lüsü + `JWT_SECRET` tanımlı olsun → Redeploy. |
| Resim/video 404 | `NEXT_PUBLIC_SUPABASE_URL` Vercel’de tanımlı olsun; Storage’da dosyalar olsun (migration veya yeni yükleme) → Redeploy. |

Detaylı kurulum: [ADIM_ADIM_KURULUM.md](ADIM_ADIM_KURULUM.md), [VERCEL_VERI_GELMIYOR.md](VERCEL_VERI_GELMIYOR.md).
