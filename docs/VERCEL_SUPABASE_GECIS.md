# Render’dan Vercel + Supabase’e Geçiş

Backend mantığı Next.js API routes + Supabase’e taşındı. **NEXT_PUBLIC_API_URL** boş bırakıldığında tüm istekler `/api/proxy` üzerinden Vercel’de işlenir; Render kullanmanız gerekmez.

---

## Ortam Değişkenleri (Vercel)

| Değişken | Zorunlu | Açıklama |
|----------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Evet | Supabase proje URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Evet | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Evet (Vercel API için) | Supabase service role key (sunucu tarafı) |
| `JWT_SECRET` | Evet (Vercel API için) | Backend ile aynı JWT secret (en az 32 karakter) |
| `NEXT_PUBLIC_API_URL` | Hayır | **Boş bırakın** – İstekler `/api/proxy` ile Vercel’de işlenir. Dolu ise Render’a yönlendirilir. |

---

## Şu An Çalışan Endpoint’ler (Yerel / Vercel)

- **Auth:** `POST /auth/login`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/register`, `POST /auth/impersonate`
- **Liste / tek kayıt (GET):** `GET /users`, `GET /users/:id`, `GET /businesses`, `GET /businesses/:id`, `GET /plans`, `GET /plans/:id`, `GET /menus`, `GET /menus/:id`, `GET /screens`, `GET /screens/:id`, `GET /templates`, `GET /templates/:id`, `GET /subscriptions` (business_user için business_id ile kapsamlanır)

Diğer path’ler (ör. `auth/account`, `auth/admin-dashboard`, `templates/:id/blocks`, `menus/stats/summary`, `public/screen/:token`, Stripe, reports, vb.) henüz yerel handler’da değil; **NEXT_PUBLIC_API_URL** boşken 501 döner. Geçiş aşamalı olarak genişletilecek.

---

## Geçiş Sırasında

- **Sadece Vercel + Supabase kullanacaksanız:** Vercel’de `SUPABASE_SERVICE_ROLE_KEY` ve `JWT_SECRET` tanımlayın, `NEXT_PUBLIC_API_URL`’i **boş bırakın** veya silin. Login, register ve `/auth/me` çalışır; diğer sayfalar için handler’lar eklenecek.
- **Render’ı kullanmaya devam edecekseniz:** `NEXT_PUBLIC_API_URL=https://tvproje-backend.onrender.com` kalsın; istekler Render’a gider, mevcut davranış değişmez.

---

## JWT_SECRET

Backend (NestJS) ile aynı secret kullanılmalı. Render’da `JWT_SECRET` ne ise Vercel’de de aynı değeri girin; böylece önce Render’da üretilmiş token’lar Vercel’de de geçerli olur.
