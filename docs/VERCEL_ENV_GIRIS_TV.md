# Giriş ve TV Yayınları Çalışmıyorsa: Vercel Environment Variables

**Mimari:** Frontend → **Vercel** | Backend → **Render** | Veritabanı / Auth → **Supabase**

Giriş yapılamıyor veya TV yayınları açılmıyorsa büyük ihtimalle **Vercel'de backend adresi tanımlı değildir.** Frontend, API isteklerini `NEXT_PUBLIC_API_URL` ile yapar; bu boşsa `http://localhost:3001` kullanılır ve canlıda backend’e ulaşılamaz.

---

## Yapılacaklar (tek seferde)

1. **Vercel Dashboard** → Projenizi seçin (menuslide / tvproje).
2. **Settings** → **Environment Variables**.
3. Aşağıdaki değişkenleri ekleyin veya güncelleyin:

| Name | Value | Açıklama |
|------|--------|----------|
| `NEXT_PUBLIC_API_URL` | `https://tvproje-backend.onrender.com` | Backend adresi (Render). **Sonda slash (/) olmasın.** |
| `NEXT_PUBLIC_APP_URL` | `https://menuslide.com` (canlı domain) | Frontend’in canlı adresi (linkler, resim base URL). |

4. **Environment** alanında **Production** (ve varsa Preview) seçili olsun → **Save**.
5. **Deployments** sekmesine gidin → en son deployment’ın yanındaki **⋯** → **Redeploy**.  
   (Env değişince mutlaka **Redeploy** gerekir; yoksa eski build kullanılır.)

---

## Kontrol

- Redeploy bittikten sonra **login sayfasını** açın. Sayfada “Backend bağlantısı yok” uyarısı **çıkmamalı**.
- Giriş yapıp dashboard’a düşebiliyorsanız backend bağlantısı çalışıyordur.
- TV yayını: Ekranın **Public URL**’ini (örn. `.../display/TOKEN`) tarayıcıda açın; veri geliyorsa TV yayını da backend üzerinden çalışıyordur.

---

## Render tarafında (backend)

Backend’in frontend’den gelen istekleri kabul etmesi için Render’da **CORS_ORIGIN** tanımlı olmalı:

- **Render** → **tvproje-backend** → **Environment**
- `CORS_ORIGIN` = Frontend canlı adresi: `https://menuslide.com` (sonda `/` olmasın). Preview için `*.vercel.app` zaten backend’de izinli.
- Kaydettikten sonra **Manual Deploy** ile backend’i yeniden deploy edin.

---

## Not

- `NEXT_PUBLIC_*` değişkenleri **build sırasında** koda gömülür. Vercel’de env ekledikten veya değiştirdikten sonra **mutlaka Redeploy** yapın.
