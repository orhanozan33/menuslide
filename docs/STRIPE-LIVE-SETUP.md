# Stripe Canlı (Live) Mod Kurulumu

Bu rehber, ödeme sistemini **gerçek para** alacak şekilde Stripe **Canlı (Live)** moda geçirmek için adımları açıklar.

## Ön koşul

- Stripe hesabı [Stripe Dashboard](https://dashboard.stripe.com) üzerinden doğrulanmış olmalı (canlı mod için Stripe hesap onayı gerekebilir).
- Test modunda checkout ve webhook’un çalıştığından emin olun.

---

## 1. Canlı API anahtarlarını al

1. [Stripe Dashboard](https://dashboard.stripe.com) → sağ üstte **“Test modu”** anahtarını **kapat** (Live moda geç).
2. **Developers → API keys** sayfasına git:  
   [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
3. Şunları kopyala:
   - **Publishable key** (`pk_live_...`)
   - **Secret key** (`sk_live_...`) — “Reveal” ile göster.

---

## 2. Backend `.env` güncelle

`backend/.env` dosyasında **test** anahtarlarını **canlı** anahtarlarla değiştir:

```env
# Stripe Canlı Mod (değerleri Stripe Dashboard'dan alın)
# Secret key sk_live_ ile, publishable pk_live_ ile başlar
STRIPE_SECRET_KEY=<Stripe Dashboard'dan Secret key>
STRIPE_PUBLISHABLE_KEY=<Stripe Dashboard'dan Publishable key>
# Webhook secret'ı 3. adımda ekleyeceksin (whsec_ ile başlar)
STRIPE_WEBHOOK_SECRET=<Webhook Signing secret>
```

- `STRIPE_WEBHOOK_SECRET` henüz yoksa 3. adımda webhook oluşturduktan sonra ekle.

---

## 3. Canlı webhook ekle

1. Stripe Dashboard’da **Live** modda olduğundan emin ol.
2. **Developers → Webhooks** → [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
3. **Endpoint URL**: Backend’in dışarıdan erişilebilir adresi:
   ```text
   https://API_ALAN_ADINIZ/subscriptions/webhook
   ```
   Örnek: `https://api.siteniz.com/subscriptions/webhook`  
   (Localhost webhook’ta çalışmaz; canlı sunucu veya ngrok gerekir.)
4. **Listen to**: “Select events”.
5. Şu olayları seç:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. **Add endpoint** ile kaydet.
7. Yeni webhook’a tıkla → **Signing secret** → **Reveal** → `whsec_...` değerini kopyala.
8. Bu değeri `backend/.env` içinde `STRIPE_WEBHOOK_SECRET=` satırına yapıştır.

---

## 4. Frontend publishable key (canlı)

Frontend’in Stripe’a istek yaptığı veya ödeme formu kullandığı ortamda **canlı** publishable key kullanılmalı.

- **Vercel / production**: Proje **Environment variables** kısmında:
  ```env
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_live ile başlayan Publishable key>
  ```
- **Local .env.local** (sadece canlı test için):
  ```env
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_live ile başlayan Publishable key>
  ```

---

## 5. Backend’i yeniden başlat

`.env` değişikliği sonrası backend’i yeniden başlat:

```bash
# Proje kökünden
./scripts/stop-system.sh
./scripts/start-clean.sh
# veya sadece backend
cd backend && npm run start:dev
```

---

## 6. Ayarlar sayfasından kontrol

1. Admin olarak giriş yap.
2. **Ayarlar → Stripe** sayfasına git.
3. Kontrol et:
   - **Bağlantı durumu**: “Bağlı” görünmeli.
   - **Secret key / Publishable key / Webhook secret**: Hepsi dolu (yeşil) olmalı.
   - **Mod**: “Canlı” (Live) yazıyorsa canlı anahtarlar kullanılıyor demektir.

---

## 7. Fiyatlar (Price ID’ler)

Bu projede checkout, plan fiyatlarını **dinamik** (`price_data`) ile oluşturuyor; yani Stripe’da önceden ürün/fiyat oluşturman **zorunlu değil**. İstersen:

- Ayarlar → Fiyatlandırma tablosunda planlara **Stripe Price ID** (canlı modda oluşturduğun `price_...`) girersen backend bunları kullanır.
- Girmezsen backend, plan’daki `price_monthly` / `price_yearly` ile otomatik fiyat oluşturur.

Canlı modda ayrı ürün/fiyat kullanmak istersen:

1. Stripe Dashboard (Live) → **Products** → yeni ürün + tekrarlayan fiyat (aylık/yıllık).
2. **Price ID**’yi (`price_...`) kopyala.
3. Admin panel → Ayarlar → Fiyatlandırma → ilgili planın “Stripe Price (aylık/yıllık)” alanına yapıştır.

---

## Özet kontrol listesi

- [ ] Stripe hesabı canlı kullanım için uygun.
- [ ] `STRIPE_SECRET_KEY=sk_live_...` backend `.env`’de.
- [ ] `STRIPE_PUBLISHABLE_KEY=pk_live_...` backend `.env`’de.
- [ ] Canlı webhook eklendi, `STRIPE_WEBHOOK_SECRET=whsec_...` backend `.env`’de.
- [ ] Frontend’de `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...` (production/env).
- [ ] Backend yeniden başlatıldı.
- [ ] Ayarlar → Stripe sayfasında “Bağlı” ve “Canlı” görünüyor.
- [ ] İsteğe bağlı: Planlar için canlı Price ID’ler Ayarlar’da girildi.

---

## Güvenlik

- **Secret key** ve **webhook secret** yalnızca backend’de kalmalı; frontend’e veya public repo’ya koyma.
- `.env` dosyası `.gitignore`’da olmalı (projede zaten olmalı).
- Canlı modda gerçek kartlarla işlem alınır; önce küçük bir test ödemesi yapmak faydalıdır.

---

## Sorun giderme

- **Webhook 401 / imza hatası**: `STRIPE_WEBHOOK_SECRET` canlı webhook’tan alınan `whsec_...` ile birebir aynı mı kontrol et; başında/sonunda boşluk olmamalı.
- **Checkout açılmıyor**: Backend log’unda Stripe hata mesajına bak; genelde yanlış key (test/live karışıklığı) veya eksik CORS/origin.
- **Ödeme sonrası abonelik oluşmuyor**: Webhook URL’in dışarıdan erişilebilir olduğunu ve Stripe → Webhooks → ilgili endpoint’te “Recent deliveries” içinde 200 döndüğünü kontrol et.

Test modu rehberi için: [STRIPE_TEST_MODE.md](../STRIPE_TEST_MODE.md) (proje kökünde).
