# Canlıda Veri / Sayfa Görünmüyor – Hızlı Çözüm

Yerelde hazırladığın sayfalar ve veriler push ile Supabase'e gittiği halde **canlı sitede (Vercel) hiçbir şey görünmüyor, sayılar 0, sayfa bozuk** ise sebep büyük ihtimalle **Vercel ortam değişkenleri**.

Tüm API istekleri `/api/proxy` üzerinden Supabase'e gider; harici backend kullanılmıyor.

## Yapılacaklar (Vercel)

1. **Vercel Dashboard** → Projen → **Settings** → **Environment Variables**
2. Şu değişkenlerin **hepsi tanımlı** olsun:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ibtnyekpnjpudjfwmzyc.supabase.co` (veya kendi proje URL’in)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase service role key (gizli)
   - `JWT_SECRET` = En az 32 karakter rastgele string
3. **Deployments** → Son deployment → **⋯** → **Redeploy**  
   (Env değiştirdikten sonra mutlaka yeniden deploy gerekir.)

## Hızlı kontrol

Push bittikten sonra script Supabase’de satır sayılarını yazdırır (businesses, users, screens, templates vb.). Sayılar 0 değilse veri Supabase’e yazılmış demektir.

## Toplu env (Vercel’e yapıştırmak için)

`frontend/import.env` dosyası Vercel’e yapıştırılacak değerleri içerir. **SUPABASE_SERVICE_ROLE_KEY** ve **JWT_SECRET** kendi değerlerinle doldurulmalı.
