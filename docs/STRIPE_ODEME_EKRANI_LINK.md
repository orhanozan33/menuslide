# Stripe Ödeme Ekranı — Link ve Son Kontrol

## Ödeme ekranı linki (Fiyatlandırma sayfası)

Kullanıcılar abonelik seçip ödemeye **fiyatlandırma sayfasından** gider. Ödeme akışı bu sayfada başlar; Stripe Checkout’a yönlendirme buradan yapılır.

### Lokal (geliştirme)

- **Türkçe:** http://localhost:3000/tr/pricing  
- **İngilizce:** http://localhost:3000/en/pricing  
- **Varsayılan (locale yok):** http://localhost:3000/pricing  

### Production (canlı site)

- **Türkçe:** `https://SITENIZ.com/tr/pricing`  
- **İngilizce:** `https://SITENIZ.com/en/pricing`  
- **Varsayılan:** `https://SITENIZ.com/pricing`  

`SITENIZ.com` yerine kendi domain’inizi yazın (örn. menuslide.com).

---

## Akış (son kontrol için)

1. Kullanıcı **/pricing** (veya /tr/pricing, /en/pricing) sayfasına girer.
2. Aylık / yıllık seçer; plan kartlarından birini seçip **Subscribe** (Abone ol) butonuna tıklar.
3. Frontend `POST /api/proxy/subscriptions/checkout` çağrısı yapar (plan id, billing interval).
4. Backend Stripe Checkout Session oluşturur ve **Stripe’ın ödeme sayfası URL’i** döner.
5. Kullanıcı bu URL’e yönlendirilir (Stripe’ın kendi ödeme ekranı).
6. Ödeme sonrası Stripe, kullanıcıyı sizin sitenize geri yönlendirir:
   - Başarı: `.../pricing?success=true`
   - İptal: `.../pricing?canceled=true`

Yani **“Stripe ödeme ekranı linki”** iki anlama gelir:

- **Sizin ekranınız (plan seçimi):** `/pricing` (yukarıdaki linkler).
- **Stripe’ın ekranı:** Backend’in döndürdüğü `url` (oturum bazlı, kullanıcıya göre değişir); doğrudan sabit bir link vermezsiniz, her zaman /pricing üzerinden gidilir.

---

## Son kontrol listesi

- [ ] **Fiyatlandırma sayfası** doğru açılıyor: `/pricing` veya `/tr/pricing`, `/en/pricing`.
- [ ] **Planlar** görünüyor: 1, 2, 3, 4, 5 ekran + sınırsız (TV başı 12.99).
- [ ] **Aylık / yıllık** geçişi çalışıyor.
- [ ] **Subscribe** tıklanınca Stripe Checkout’a yönlendirme oluyor (test modunda Stripe test kartı ile deneyin).
- [ ] **Başarı / iptal** sonrası `/pricing?success=true` veya `?canceled=true` ile dönüş ve toast mesajları çalışıyor.
- [ ] **Backend .env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (production’da), `STRIPE_PUBLISHABLE_KEY` (frontend’de gerekirse) tanımlı.
- [ ] **Ayarlar** sayfasında planlara Stripe Price ID’leri (aylık/yıllık) girilmiş.

Test kartı (Stripe test modu): `4242 4242 4242 4242`. Daha fazlası: [Stripe test kartları](https://docs.stripe.com/testing#cards).
