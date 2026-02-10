# MenuSlide TV Uygulaması – Adım Adım Kullanım (v1.0.6)

Bu rehber, **yeni derlenen sürümü (versionCode 6)** yükledikten sonra kullanıcıların sürüm uyarısı ve izinleri görmesi ile uygulamanın kapanınca otomatik tekrar açılması için yapmanız gerekenleri adım adım anlatır.

---

## 1. APK’yı sunucuya yükleyin (sürüm uyarısı için)

Kullanıcıların “güncelleme var” ve “izin ver” ekranlarını görmesi için sunucudaki sürüm bilgisini güncellemeniz gerekir.

1. **Admin panele girin** (menuslide.com veya kendi domain’iniz).
2. **Ayarlar** sayfasına gidin.
3. **TV uygulaması** bölümüne inin.
4. **“APK yükle”** ile bu sürümün APK’sını seçin:
   - Proje içi yol: `frontend/public/downloads/Menuslide.apk`  
   - veya `android-tv/app/build/outputs/apk/release/app-release.apk`
5. Yükleme bitince **“Kaydet”** butonuna basın.  
   Böylece `latest_version_code = 6` ve `latest_version_name = 1.0.6` sunucuya yazılır; eski sürümü açan kullanıcılar güncelleme ve izin isteği görecek.

---

## 2. TV’de / cihazda yeni sürümü yükleme

- **Eski sürüm yüklüyse:** Uygulama açıldığında “Güncelleme var” çıkacak; **Güncelle** deyip indirilen APK’yı kurun.  
  Veya APK’yı USB/ayarlar üzerinden cihaza atıp elle yükleyin.
- **İlk kurulumsa:** `Menuslide.apk` dosyasını cihaza atıp yükleyin.

---

## 3. Kullanıcıların göreceği ekranlar (sürüm + izinler)

Yeni sürüm ilk açıldığında:

1. **Sürüm kontrolü**  
   Uygulama sunucudan config alır. Eğer cihazdaki sürüm sunucudaki `latest_version_code` (6) altındaysa:
   - “Güncelleme var” veya “Güncelleme gerekli” diyaloğu çıkar.
   - **Güncelle** ile indirip kurabilir.

2. **Pil izni (kesintisiz yayın)**  
   Kayıtlı kodla veya “Başlat” ile yayına geçerken:
   - “Pil optimizasyonundan muaf tut” için **sistem ayar ekranı** açılır.
   - Kullanıcı **İzin ver** derse yayın kesintisiz çalışmaya daha uygun olur.

Bu davranış, Ayarlar’da APK yükleyip **Kaydet** yaptığınızda (adım 1) otomatik çalışır.

---

## 4. Otomatik tekrar açılma (kullanıcı çıkış yapmadıysa)

- **Yayın açıkken** uygulama kapanırsa (sistem öldürmesi, donma vb.):
  - **2 dakikada bir** kontrol eden bir alarm vardır.
  - Kayıtlı kod varsa ve **kullanıcı “Geri” ile çıkış yapmadıysa** uygulama otomatik tekrar açılır ve aynı kodla yayına döner.

- **Kullanıcı “Geri” ile çıkarsa:**
  - “Çıkış yaptım” sayılır, otomatik açılma **yapılmaz**.
  - Tekrar açmak için kullanıcı uygulamayı launcher’dan açar; kod zaten kayıtlı olduğu için doğrudan yayına geçer.

- **Cihaz yeniden başlarsa:**  
  Açılışta (BOOT_COMPLETED) uygulama otomatik başlar; kayıtlı kod varsa yayın ekranına gider.

---

## 5. Özet kontrol listesi

| Yapılacak | Açıklama |
|-----------|----------|
| Ayarlar’da APK yükle + Kaydet | Sunucuda `latest_version_code = 6` olur; kullanıcılar sürüm ve izin ekranlarını görür. |
| TV’de yeni APK’yı kur | Güncelle veya elle kurulum. |
| Pil iznini ver | İlk açılışta/başlatmada sistem ekranından “İzin ver”. |
| Çıkış = Geri tuşu | Otomatik yeniden açılmayı iptal eder. |

---

## 6. Derlenen dosyalar

- **Release APK:**  
  `android-tv/app/build/outputs/apk/release/app-release.apk`  
  (veya imzalı sürüm)
- **Site indirme kopyası:**  
  `frontend/public/downloads/Menuslide.apk`  
  Siteden `/downloads/Menuslide.apk` ile indirilebilir.

**Bu sürüm:** versionCode **6**, versionName **1.0.6**.

---

## Düşük RAM / Eski TV – Sorunsuz Çalışma

Uygulama düşük RAM ve eski TV modellerinde de akıcı çalışsın diye şu ayarlar yapıldı:

| Özellik | Normal cihaz | Düşük RAM (≈96 MB heap ve altı) |
|--------|----------------|-----------------------------------|
| WebView önbellek | Kapalı (LOAD_NO_CACHE) | Aynı |
| WebView yenileme | 12 dk | **8 dk** (daha sık) |
| WebView çizim | Donanım | **Yazılım katmanı** (GPU bellek tasarrufu) |
| ExoPlayer buffer | 30s–120s | **15s–60s** |
| Bellek baskısı | Orta seviyede temizlik | **Hemen** cache temizle + yenile |

- **largeHeap:** Açık; cihaz destekliyorsa biraz daha heap verir.
- **Safe Browsing:** WebView’da kapalı (bellek ve ağ tasarrufu).
- **Render process çökmesi:** WebView yeniden oluşturulup aynı sayfa yüklenir.

Eski veya düşük RAM’li TV’de test ederken: yayını en az 15–20 dakika açık bırakın; geçişlerde donma veya kapanma olmamalı. Olursa cihazda “Düşük bellek” log’u (adb logcat \| grep MenuSlideTV) ile kontrol edebilirsiniz.
