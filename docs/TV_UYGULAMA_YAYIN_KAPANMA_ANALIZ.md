# TV / Mobil Uygulama – Yayında Kapanma Analizi ve Düzeltmeler

## Tespit Edilen Nedenler

1. **Heartbeat süresi kısa (2 dakika)**  
   Sunucu, 2 dakika heartbeat almayınca oturumu siliyordu. TV’de geçici ağ kesintisi veya WebView’ın uykuya geçmesi (ekran kapalı / arka plan) sonrası TV tekrar bağlansa bile “yeni” oturum sayılıp **ikinci cihaz** gibi bloklanabiliyordu → ekran siyaha dönüyordu (“sistemden atıldı” hissi).

2. **Bloklu ekran geri açılmıyordu**  
   Aynı display linki başka cihazda (telefon/tablet) açıldığında TV’ye `allowed: false` dönüyor ve ekran tamamen siyah kalıyordu. Diğer cihaz kapatılsa bile TV tarafında yeniden heartbeat ile izin kontrolü yapılmadığı için ekran açılmıyordu.

3. **WebView donması**  
   Android’de display sayfası WebView’da açılıyor. Uzun süre açık kalan WebView’da donma veya siyah ekran görülebiliyordu. Watchdog sadece ExoPlayer (video stream) için vardı; WebView modunda periyodik yenileme yoktu.

---

## Yapılan Düzeltmeler

### 1. Backend + API (heartbeat süresi)

- **Dosyalar:**  
  `backend/src/public/public-local.service.ts`,  
  `frontend/lib/api-backend/handlers/public-screen.ts`,  
  `frontend/lib/api-backend/handlers/screens.ts`,  
  `frontend/lib/api-backend/handlers/crud.ts`
- **Değişiklik:** Viewer “stale” süresi **2 dakika → 5 dakika**.
- **Sonuç:** Kısa ağ/uyku kesintilerinde TV oturumu silinmiyor; tekrar bağlandığında “ilk cihaz” olarak kalma ihtimali artıyor.

### 2. Display sayfası (bloklu iken tekrar izin)

- **Dosya:** `frontend/app/(public)/display/[token]/page.tsx`
- **Değişiklik:** `viewAllowed === false` iken (ekran bloklu) **20 saniyede bir** heartbeat atılıyor; sunucu `allowed: true` döndüğünde ekran tekrar açılıyor.
- **Sonuç:** Aynı linki açan diğer cihaz kapatıldığında TV, bir süre içinde otomatik olarak tekrar yayına dönüyor.

### 3. Android TV uygulaması (WebView donma önlemi)

- **Dosya:** `android-tv/app/src/main/java/com/digitalsignage/tv/MainActivity.kt`
- **Değişiklikler:**
  - Display URL’si (`/display/`) WebView’da açıldığında watchdog artık **sadece WebView’ı** kontrol ediyor; ExoPlayer null olduğu için her seferinde `resolveAndPlay` tetiklenmesi kaldırıldı.
  - WebView modunda **30 dakikada bir** `displayWebView.reload()` ile sayfa yenileniyor (24/7 yayında 10 dk şablonları bölmez).
  - WebView çökerse (API 26+) aynı display URL otomatik tekrar yüklenir.
- **Sonuç:** Uzun süre açık kalan display sayfasında donma veya siyah ekran oluşursa otomatik toparlanıyor; 24 saat / günlerce kesintisiz yayın hedeflenir.

---

## Test Önerileri

1. **Tek TV, uzun süre yayın**  
   Yayını 30+ dakika açık bırakın; 10 dk’da bir WebView yenilmesiyle ekranın tekrar düzgün göründüğünü kontrol edin.

2. **Aynı link iki cihazda**  
   Aynı display linkini önce TV’de, sonra telefondan açın; TV’nin siyaha döndüğünü görün. Telefondan sayfayı kapatın; 20 saniye civarında TV’nin tekrar yayına dönmesini kontrol edin.

3. **Kısa ağ kesintisi**  
   TV yayındayken WiFi’yi 1–2 dakika kapatıp açın; 5 dakikalık stale süresi sayesinde oturumun silinmediğini ve yayının devam ettiğini doğrulayın.

---

## Cihaz Tarafında Öneriler (Opsiyonel)

- **Pil tasarrufu / uygulama uyku:** TV/tablet ayarlarında bu uygulama için “Pil optimizasyonu yok” veya “Arka planda çalışsın” benzeri seçenekleri açın; heartbeat’in kesilmesi azalır.
- **Güvenli başlatma:** Cihaz açıldığında otomatik başlatma zaten `BootReceiver` ile yapılıyor; gerekirse cihaz üreticisinin “Otomatik başlatma” listesine uygulamayı ekleyin.

Bu değişikliklerle yayın sırasında kapanma / siyah ekran / “sistemden atılma” davranışının büyük ölçüde azalması hedeflenmiştir.
