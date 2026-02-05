# 500 / 404 Hata Rehberi

## 404 – “This page could not be found”

### Ne yapıldı?
- **`app/[locale]/layout.tsx`**: `dynamicParams = true` ve `dynamic = 'force-dynamic'` eklendi; `[locale]` rotaları her istekte sunuluyor.
- **`app/not-found.tsx`** ve **`app/[locale]/not-found.tsx`**: Ortak 404 sayfaları eklendi; “Ana sayfaya dön” linki locale’e uyumlu.

### Senin yapman gerekenler
1. **Adresi doğru kullan:** Giriş için her zaman locale’li adres kullan: `http://localhost:3000/tr` veya `http://localhost:3000/tr/dashboard`. Kök adres `http://localhost:3000/` middleware ile `http://localhost:3000/tr` (veya dil tercihine göre) yönlendirilir.
2. **Cache temizle ve dev’i yeniden başlat:**  
   `cd frontend && rm -rf .next && npm run dev`
3. **Linkler:** Sidebar zaten `localePath()` kullanıyor; yeni linklerde de `localePath('/sayfa')` kullan (örn. `/tr/sayfa`).

---

## 500 Internal Server Error (main.js, react-refresh.js, _app.js, _error.js)

### Ne anlama geliyor?

Tarayıcı Next.js’in JavaScript chunk’larını (main.js, react-refresh.js, _app.js, _error.js) istediğinde sunucu **500 Internal Server Error** dönüyor. Bu dosyalar normalde `/_next/static/...` veya `/_next/static/chunks/fallback/...` altında sunulur. Sayfa (örn. `/tr/editor`) 500 döndüğünde fallback chunk'lar da 500 alabilir; asıl sebep sayfa isteğidir.

## Olası nedenler

1. **Yanlış adres / port**  
   Uygulama `http://localhost:3001` (backend) üzerinden açılıyorsa, JS istekleri backend’e gider; backend bu yolları bilmediği için 500 verebilir.  
   **Çözüm:** Frontend’i her zaman **http://localhost:3000** üzerinden açın.

2. **Bozuk veya eski build / cache**  
   `.next` veya cache bozulduysa chunk’lar üretilemeyebilir, sunucu 500 dönebilir.  
   **Çözüm:** Aşağıdaki “Önbelleği temizleyip yeniden başlatma” adımlarını uygulayın.

3. **Derleme / runtime hatası**  
   Bir sayfa veya bileşen (ör. Polotno editörü) derlenirken veya çalışırken hata veriyorsa, ilgili chunk isteği 500 ile karşılık görebilir.  
   **Çözüm:** Terminalde `npm run dev` çıktısındaki hata mesajlarına bakın; hangi sayfa/chunk’ta hata varsa orayı düzeltin.

## Önbelleği temizleyip yeniden başlatma

```bash
cd frontend
rm -rf .next
npm run dev
```

İsterseniz node modül önbelleğini de temizleyin:

```bash
cd frontend
rm -rf .next node_modules/.cache
npm run dev
```

## Hangi istek 500 alıyor?

1. Tarayıcıda **F12** → **Network** sekmesini açın.
2. Sayfayı yenileyin.
3. Kırmızı (failed) olan isteği tıklayın.
4. **Headers** veya **Preview** kısmında **Request URL**’e bakın.

- URL `http://localhost:3000/_next/...` ise hata **Next.js (frontend)** tarafındadır; `npm run dev` çıktısındaki hata mesajına bakın.
- URL `http://localhost:3001/...` ise istek **backend**’e gidiyordur; frontend’i **3000** portunda açıp tekrar deneyin.

## Sadece Design Editor sayfasında 500

Polotno ile ReactStrictMode bazen sorun çıkarabiliyor. Denemek için `next.config.js` içinde:

```js
const nextConfig = {
  reactStrictMode: false,  // geçici olarak kapatın
  // ...
};
```

Değişiklikten sonra `.next` silip `npm run dev` ile yeniden başlatın.

## Editör sayfası 500 veriyorsa

- **`app/[locale]/(admin)/editor/error.tsx`**: Editör yüklenirken hata olursa "Tasarım editörü yüklenemedi" mesajı ve "Tekrar dene" butonu gösterilir.
- **GrapesJS** artık sadece istemcide yükleniyor: `GrapesEditorClient.tsx` yalnızca tarayıcıda çalışır; sunucu tarafında grapesjs hiç yüklenmez (500 riski azaltıldı).
- **Middleware** try-catch ile sarıldı; beklenmeyen hata olursa istek yine de devam eder.
- 500 devam ediyorsa **terminalde** `npm run dev` çıktısındaki hata mesajına bakın.
- **Temiz başlangıç (mutlaka deneyin):**
  ```bash
  cd frontend
  rm -rf .next
  npm run dev
  ```
  Sonra tarayıcıda **http://localhost:3000/tr/editor** adresini açın (backend 3001 değil, frontend 3000).
