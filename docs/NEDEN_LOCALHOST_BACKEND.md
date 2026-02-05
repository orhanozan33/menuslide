# Canlıda Neden Backend Localhost’a Gidiyor?

Frontend (menuslide.com) canlıda açıldığında istekler **localhost:3001**’e gidiyorsa sebep şudur:

---

## Sebep

Kodda backend adresi şöyle:

```ts
process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
```

**Next.js** `NEXT_PUBLIC_*` değişkenlerini **build sırasında** koda gömüyor. Yani:

- Vercel’de **build** yapılırken `NEXT_PUBLIC_API_URL` **tanımlı değilse** (veya boşsa), koda **localhost:3001** yazılır.
- Canlıda sayfa açılsa bile tarayıcıdaki JS zaten “localhost:3001” kullanır; ortam sonradan değişse bile bu değişmez.

Yani backend’in local’den alınması, **Vercel’de bu env’in build sırasında yok veya yanlış olması** demektir.

---

## Ne Yapmalısın?

1. **Vercel** → Projen (menuslide) → **Settings** → **Environment Variables**.
2. Şu değişkeni ekle veya düzelt:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://tvproje-backend.onrender.com`  
     (sonda **/** olmasın.)
3. **Environment:** **Production** (ve istersen Preview) işaretli olsun → **Save**.
4. **Deployments** → en son deployment → **⋯** → **Redeploy**.
5. Redeploy **bitene kadar** bekle (env değişince mutlaka yeni build gerekir).

Bundan sonra canlı sitede backend adresi **https://tvproje-backend.onrender.com** olur; localhost kullanılmaz.

---

## Kontrol

Redeploy bittikten sonra:

- **menuslide.com**’u aç (mümkünse gizli pencere veya farklı tarayıcı).
- Giriş sayfasında “Backend bağlantısı yok” uyarısı **çıkmamalı**.
- Giriş yapmayı dene; istekler **tvproje-backend.onrender.com**’a gitmeli (tarayıcı Network sekmesinden kontrol edebilirsin).

Özet: Canlıda backend’in local’den alınması = Vercel’de **NEXT_PUBLIC_API_URL** yok/yanlış + **Redeploy** yapılmamış. Yukarıdaki adımlar bunu düzeltir.
