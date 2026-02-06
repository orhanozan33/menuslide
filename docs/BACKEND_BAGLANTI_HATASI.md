# "Backend bağlantı hatası" Çözümü

Bu mesaj, frontend’in backend’e (Render) istek atamadığı anlamına gelir.

---

## 1. Vercel ortam değişkenleri

Frontend canlıda **NEXT_PUBLIC_API_URL** ile backend adresini kullanır. Tanımlı değilse veya yanlışsa bağlantı kurulamaz.

- **Vercel** → Proje → **Settings** → **Environment Variables**
- Şunları ekleyin/güncelleyin:

| Değişken | Değer |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://tvproje-backend.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | `https://menuslide.com` |

**Önemli:** Değişkenleri kaydettikten sonra **Redeploy** yapın (Deployments → ⋯ → Redeploy).  
`NEXT_PUBLIC_*` değişkenleri build sırasında gömülür; redeploy olmadan yeni değer kullanılmaz.

Detay: [VERCEL_ENV_GIRIS_TV.md](./VERCEL_ENV_GIRIS_TV.md)

---

## 2. Render backend’in çalışması

- **Render** üzerinde backend servisi **Running** olmalı.
- Ücretsiz planda bir süre istek gelmezse servis **uyur**; ilk istekte 30–60 saniye uyanma süresi olabilir. Bu sırada "Backend bağlantı hatası" veya zaman aşımı görülebilir. Birkaç saniye bekleyip sayfayı yenileyin.

---

## 3. Backend CORS (Render)

Backend’in, frontend’den gelen istekleri kabul etmesi için:

- **Render** → **tvproje-backend** → **Environment**
- `CORS_ORIGIN` = `https://menuslide.com` (sonda `/` olmasın)
- Kaydedip **Manual Deploy** ile backend’i yeniden deploy edin.

---

## Özet

1. Vercel’de `NEXT_PUBLIC_API_URL` doğru ve **Redeploy** yapıldı mı?
2. Render’da backend servisi çalışıyor mu? (Cold start’ta birkaç saniye bekleyin.)
3. Render’da `CORS_ORIGIN` tanımlı mı ve backend yeniden deploy edildi mi?
